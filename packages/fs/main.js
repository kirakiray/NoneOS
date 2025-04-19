export { init } from "./handle/main.js";
import { get as systemHandleGet } from "./handle/main.js";
import { createGet } from "./remote/main.js";

export const get = async (path, options) => {
  // 判断是否有远端用户的目录引用
  const pathArr = path.split("/");
  const rootName = pathArr[0];
  if (rootName.includes(":")) {
    const [userId, reRootName] = rootName.split(":");

    // 远端用户的目录引用
    const remoteGet = createGet(userId);
    const rePath = [reRootName, ...pathArr.slice(1)].join("/");

    return remoteGet(rePath, options);
  }

  return systemHandleGet(path, options);
};
