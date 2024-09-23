import { getErr } from "./errors.js";

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

  // 给远端用，获取分块数据
  async _getHashMap(options = {}) {
    const chunkSize = options.size || 64 * 1024;

    // 获取指定的块内容
    const result = await this.buffer();

    const datas = await splitIntoChunks(result, chunkSize);

    const hashs = await Promise.all(
      datas.map(async (chunk) => {
        return await calculateHash(chunk);
      })
    );

    return [
      {
        bridgefile: 1,
        size: await this.size(),
      },
      ...hashs,
    ];
  }

  // 给远端用，根据id或分块哈希sh获取分块数据
  async _getBlock(hash, index) {
    if (index !== undefined) {
      // 有块index的情况下，读取对应块并校验看是否合格
      const chunk = await this.buffer({
        start: index * 64 * 1024,
        end: (index + 1) * 64 * 1024,
      });

      const realHash = await calculateHash(chunk);

      if (realHash === hash) {
        return chunk;
      }

      // 如果hash都不满足，重新查找并返回
    }

    const file = await this.file();

    const hashMap = new Map();

    const chunks = await splitIntoChunks(file, 64 * 1024);

    await Promise.all(
      chunks.map(async (chunk) => {
        const hash = await calculateHash(chunk);
        hashMap.set(hash, chunk);
      })
    );

    return hashMap.get(hash);
  }
}
