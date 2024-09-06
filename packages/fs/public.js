import { getErr } from "./errors.js";

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
