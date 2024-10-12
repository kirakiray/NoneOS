import { getErr } from "./errors.js";
import { splitIntoChunks, calculateHash } from "./util.js";
import { CHUNK_REMOTE_SIZE } from "./util.js";
import { getCache, saveCache } from "./cache/main.js";

/**
 * 物理拷贝文件/文件夹的方法，兼容所有类型的handle
 * 复制目标到另一个目标
 * @param {handle} source 源文件/目录
 * @param {handle} target 目标文件/目录
 * @param {string} name 复制过去后的命名
 * @param {function} callback 复制过程中的callback
 */
export const copyTo = async ({ source, target, name, callback }) => {
  [target, name] = await fixTargetAndName({ target, name, self: source });

  if (source.kind === "file") {
    const selfFile = await source.file();
    const newFile = await target.get(name, { create: "file" });
    await newFile.write(selfFile, callback);

    return newFile;
  } else if (source.kind === "dir") {
    const newDir = await target.get(name, {
      create: "dir",
    });

    await source.forEach(async (handle) => {
      await copyTo({
        source: handle,
        target: newDir,
        name: handle.name,
        callback,
      });
    });

    return newDir;
  }
};

// 修正 target 和 name 的值
export const fixTargetAndName = async ({ target, name, self }) => {
  if (typeof target === "string") {
    name = target;
    target = await self.parent();
  }

  if (!name) {
    name = self.name;
  }

  // 查看是否已经有同名的文件或文件夹
  let exited = false;
  for await (let subName of target.keys()) {
    if (name === subName) {
      exited = 1;
      break;
    }
  }

  if (exited) {
    throw getErr("exitedName", {
      name: `${name}(${target.path}/${name})`,
    });
  }

  if (isSubdirectory(target.path, self.path)) {
    throw getErr("notMoveToChild", {
      targetPath: target.path,
      path: self.path,
    });
  }

  return [target, name];
};

function isSubdirectory(child, parent) {
  if (child === parent) {
    return false;
  }
  const parentTokens = parent.split("/").filter((i) => i.length);
  const childTokens = child.split("/").filter((i) => i.length);
  return parentTokens.every((t, i) => childTokens[i] === t);
}

export class PublicBaseHandle {
  constructor() {}

  // 按照需求将文件保存到缓存池中，方便远端获取
  async _saveCache(options) {
    const chunkSize = options.size;

    // 获取指定的块内容
    const result = await this.buffer();
    const datas = await splitIntoChunks(result, chunkSize);

    const hashs = [];

    await Promise.all(
      datas.map(async (chunk, i) => {
        const hash = await calculateHash(chunk);

        hashs[i] = hash;

        await saveCache(hash, chunk);
      })
    );

    if (options.returnHashs) {
      return hashs;
    }

    return true;
  }

  // 从缓冲池进行组装文件并写入
  async _writeByCache(options) {
    const { hashs } = options;

    const chunks = await Promise.all(
      hashs.map(async (hash) => {
        return getCache(hash);
      })
    );

    // 写入文件
    const writer = await this.createWritable();

    for (let chunk of chunks) {
      await writer.write(chunk);
    }

    writer.close();

    return true;
  }

  // // 给远端用，获取分块数据
  // async _getHashMap(options) {
  //   options = options || {};
  //   const chunkSize = options.size || CHUNK_REMOTE_SIZE;

  //   // 获取指定的块内容
  //   const result = await this.buffer();

  //   const datas = await splitIntoChunks(result, chunkSize);

  //   const hashs = await Promise.all(
  //     datas.map(async (chunk) => {
  //       return await calculateHash(chunk);
  //     })
  //   );

  //   return [
  //     {
  //       bridgefile: 1,
  //       size: await this.size(),
  //     },
  //     ...hashs,
  //   ];
  // }

  // // 给远端用，根据id或分块哈希获取分块数据
  // async _getChunk(hash, index, size) {
  //   if (!size) {
  //     size = CHUNK_REMOTE_SIZE;
  //   }

  //   if (index !== undefined) {
  //     // 有块index的情况下，读取对应块并校验看是否合格
  //     const chunk = await this.buffer({
  //       start: index * size,
  //       end: (index + 1) * size,
  //     });

  //     const realHash = await calculateHash(chunk);

  //     if (realHash === hash) {
  //       return chunk;
  //     }

  //     // 如果hash都不满足，重新查找并返回
  //     debugger;
  //   }

  //   const file = await this.file();

  //   const hashMap = new Map();

  //   const chunks = await splitIntoChunks(file, size);

  //   await Promise.all(
  //     chunks.map(async (chunk) => {
  //       const hash = await calculateHash(chunk);
  //       hashMap.set(hash, chunk);
  //     })
  //   );

  //   return hashMap.get(hash);
  // }

  // 根据哈希值，从缓存目录获取块数据，再合并成一个完整的文件
  async _mergeChunk(hashs, cacheDirPath) {
    const cacheDir = await (await this.root()).get(cacheDirPath);

    if (!cacheDir) {
      throw new Error("没有找到缓冲目录");
    }

    const writer = await this.createWritable();

    for (let hash of hashs) {
      const handle = await cacheDir.get(hash);
      if (!handle) {
        const err = get("notFoundChunk", {
          path: item.path,
          hash,
        });
        console.error(err);
        await writer.abort();
        throw err;
      }

      const data = await handle.buffer();
      await writer.write(data);
    }

    // 没有报错
    await writer.close();

    return true;
  }
}
