export { init } from "./handle/main.js";
import { get as systemHandleGet } from "./handle/main.js";
import { createGet } from "./re-remote/main.js";
import { createUser } from "../new-user/main.js";

export const get = async (path, options) => {
  if (!path) {
    throw new Error("path is required");
  }

  // 判断是否有远端用户的目录引用
  const pathArr = path.split("/");
  const rootName = pathArr[0];
  if (rootName.includes(":")) {
    const [mark, reRootName] = rootName.split(":");

    let userId;
    if (mark.startsWith("$user-")) {
      userId = mark.split("-")[1];
    }

    const localUser = await createUser();
    const remoteUser = await localUser.connectUser(userId);

    // if (remoteUser.mode === 1) {
    //   // 如果只是服务器中转模式，请等一下
    //   await new Promise((resolve) => setTimeout(resolve, 200));
    // }

    // 远端用户的目录引用
    const remoteGet = createGet({ remoteUser });
    const rePath = [reRootName, ...pathArr.slice(1)].join("/");

    return remoteGet(rePath, options);
  }

  return systemHandleGet(path, options);
};
