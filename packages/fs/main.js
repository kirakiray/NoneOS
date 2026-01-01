export { init } from "./handle/main.js";
import {
  mount,
  getMounted,
  unmount,
  get as mountedGet,
} from "./handle/mount/mount.js";
export { mount, getMounted, unmount };
import { get as systemHandleGet } from "./handle/main.js";

export const get = async (path, options) => {
  if (!path) {
    throw new Error("path is required");
  }

  if (path.startsWith("$mount-")) {
    return mountedGet(path, options);
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

    const { createUser } = await import("/packages/user/main.js");

    const localUser = await createUser();
    const remoteUser = await localUser.connectUser(userId);

    if (remoteUser.mode === 1) {
      // 等待 rtc 初始化操作
      try {
        remoteUser.initRTC();
      } catch (error) {
        console.log("initRTC error", error);
      }
    }

    const { createGet } = await import("./fs-remote/main.js");

    // 远端用户的目录引用
    const remoteGet = createGet({ remoteUser });
    const rePath = [reRootName, ...pathArr.slice(1)].join("/");

    return remoteGet(rePath, options);
  }

  return systemHandleGet(path, options);
};
