import { getErr } from "./errors.js";

/**
 * 目标handle到另一个目录
 * @param {handle} source 源文件/目录
 * @param {handle} target 目标文件/目录
 * @param {string} name 移动过去后的命名
 * @param {function} callback 移动过程中的callback
 */
export const moveTo = async (source, target, name, callback) => {
  const newTarget = await copyTo(source, target, name, callback);
  await source.remove();

  return newTarget;
};

/**
 * 复制目标到另一个目标
 * @param {handle} source 源文件/目录
 * @param {handle} target 目标文件/目录
 * @param {string} name 复制过去后的命名
 * @param {function} callback 复制过程中的callback
 */
export const copyTo = async (source, target, name, callback) => {
  [target, name] = await getTargetAndName({ target, name, self: source });

  if (source.kind === "file") {
    const selfFile = await source.file();
    const newFile = await target.get(name, { create: "file" });
    await newFile.write(selfFile);
    return newFile;
  } else if (source.kind === "dir") {
    const newDir = await target.get(name, {
      create: "dir",
    });

    await source.forEach(async (handle) => {
      await handle.copyTo(newDir, handle.name);
    });

    return newDir;
  }
};

// 修正 target 和 name 的值
export const getTargetAndName = async ({ target, name, self }) => {
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
