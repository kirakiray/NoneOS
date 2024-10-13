import { getErr } from "./errors.js";
import { splitIntoChunks, calculateHash, flatHandle } from "./util.js";
import { CHUNK_REMOTE_SIZE } from "./util.js";
import { fetchCache, saveCache } from "./cache/main.js";

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

  // 扁平化文件数据
  async flat() {
    return flatHandle(this);
  }

  // 按照需求将文件保存到缓存池中，方便远端获取
  async _saveCache(arg) {
    const chunkSize = arg.size;
    const { options, returnHashs } = arg;

    // 获取指定的块内容
    const result = await this.buffer(options);
    const datas = await splitIntoChunks(result, chunkSize);

    const hashs = [];

    await Promise.all(
      datas.map(async (chunk, i) => {
        const hash = await calculateHash(chunk);

        hashs[i] = hash;

        await saveCache(hash, chunk);
      })
    );

    if (returnHashs) {
      return hashs;
    }

    return true;
  }

  // 从缓冲池进行组装文件并写入
  async _writeByCache(options) {
    const { hashs } = options;

    const chunks = await Promise.all(
      hashs.map(async (hash) => {
        return fetchCache(hash);
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

  async _getHashs(options) {
    options = options || {};
    const chunkSize = options.size || CHUNK_REMOTE_SIZE;

    // 获取指定的块内容
    const result = await this.buffer();

    const datas = await splitIntoChunks(result, chunkSize);

    const hashs = await Promise.all(
      datas.map(async (chunk) => {
        return await calculateHash(chunk);
      })
    );

    return hashs;
  }

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
