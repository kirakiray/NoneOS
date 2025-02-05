import { calculateHash, CHUNK_SIZE, flatHandle, getHashs } from "./util.js";
import { saveData, getData } from "../core/block/main.js";

// 需要监听的文件或文件夹的数组
const needObserver = [];

let changeTimer = null;
let CTIME = 100;

const castChannel = new BroadcastChannel("nfs-handle-change");
castChannel.onmessage = (event) => {
  _changeHandle(event.data, 1);
};

// 写入文件结束后的处理
export const _changeHandle = async (opts, ignoreChannel = false) => {
  if (!changeTimer) {
    changeTimer = 1;
    setTimeout(() => {
      changeTimer = null;

      for (let obsOption of needObserver) {
        try {
          if (obsOption.pool && obsOption.pool.length) {
            obsOption.func.call(null, obsOption.pool.slice());
            obsOption.pool.length = 0; // 清空池子
          }
        } catch (err) {
          console.error(err);
        }
      }
    }, CTIME);
  }

  needObserver.forEach((obsOption) => {
    const { path } = opts;
    if (path.startsWith(obsOption.handle.path)) {
      obsOption.pool.push({
        ...opts,
      });
    }
  });

  if (!ignoreChannel) {
    castChannel.postMessage(opts);
  }
};

export class PublicBaseHandle {
  constructor() {}

  // 监听文件或文件夹的变化
  observe(func) {
    const obj = {
      handle: this,
      func,
      pool: [], // 存储数据改动变化数据的池子
    };

    needObserver.push(obj);

    return () => {
      const index = needObserver.indexOf(obj);
      if (index > -1) {
        needObserver.splice(index, 1);
      }
    };
  }

  // 扁平化文件数据
  async flat() {
    return flatHandle(this);
  }

  // 给拷贝进度用的方法，获取文件或文件夹的分块信息
  async _info() {
    const flatData = await this.flat();

    const reData = await Promise.all(
      flatData.map(async (item) => {
        const { handle } = item;

        const hashs1m = await handle._getHashs();
        const hash = await handle.hash();

        return [
          item.path,
          {
            size: item.size,
            hashs1m,
            hash,
          },
        ];
      })
    );

    return reData;
  }

  // 按照需求将文件保存到缓存池中，方便远端获取
  async _saveCache({ options }) {
    // 获取指定的块内容
    const data = await this.file(options);

    return await saveData({
      data,
      reason: "save-cache",
      path: this.path,
      userId: this.__remote_user,
    });
  }

  // 从缓存区获取数据并写入
  async _writeByCache({ hashs, userId }) {
    const data = await getData({
      hashs,
      userId,
      path: this.path,
      reason: "remote-write-cache",
    });

    return await this.write(data);
  }

  // 获取文件哈希值的方法
  async hash() {
    if (this.kind === "dir") {
      throw new Error(`The directory cannot use the hash method`);
    }

    const hashs = await this._getHashs();

    const hash = await calculateHash(hashs.join(""));

    return hash;
  }

  // 获取1mb分区哈希块数组
  async _getHashs(options) {
    if (this.kind === "dir") {
      throw new Error(`The directory cannot use the _getHashs method`);
    }

    const chunkSize = options?.chunkSize || CHUNK_SIZE;

    if (this.kind === "file") {
      return getHashs(await this._fsh.getFile(), chunkSize);
    }
  }

  // 直接计算数据的哈希值
  async _dataHash() {
    const cachedBlob = await this.file();
    return await calculateHash(cachedBlob);
  }

  // 读取缓存的chunk并，合并文件后写入
  async _mergeChunks(options) {
    const { flatFileDatas, delayTime } = options;

    let blobsDir;
    {
      const parent = await this.parent();
      blobsDir = await parent.get(`${this.name}.fs_task_cache`);
    }

    const targetHandle = this;

    if (this.kind === "dir") {
      // 目录合并
      let count = 0;
      // 根据信息开始合并文件
      for (let [path, info] of flatFileDatas) {
        const { afterPath } = info;

        const { hashs1m } = info;

        await mergeBlob({
          path,
          hashs1m,
          blobsDir,
          merge: (e) => {
            count++;

            options.merge &&
              options.merge({
                ...e,
                count,
                total: flatFileDatas.length,
              });
          },
          delayTime,
          fileHandle: await targetHandle.get(afterPath, {
            create: "file",
          }),
        });
      }
    } else {
      // 文件合并
      const [path, info] = flatFileDatas[0];
      const { hashs1m } = info;

      await mergeBlob({
        path,
        hashs1m,
        blobsDir,
        merge: options.merge,
        delayTime,
        fileHandle: targetHandle,
      });
    }

    return true;
  }
}

// 合并文件
const mergeBlob = async ({
  path,
  hashs1m,
  blobsDir,
  merge,
  delayTime,
  fileHandle,
}) => {
  const fileBlobs = await Promise.all(
    hashs1m.map(async (hash) => {
      const handle = await blobsDir.get(hash);

      if (!handle) {
        // TODO: 块数据没有找到，需要重新复制
        debugger;
        throw new Error("no blob here");
      }

      return handle.file();
    })
  );

  await fileHandle.write(new Blob(fileBlobs));

  if (merge) {
    merge({
      path: fileHandle.path,
      fromPath: path,
      count: 1,
      total: 1,
    });
  }

  if (delayTime) {
    await new Promise((resolve) => setTimeout(resolve, delayTime));
  }
};
