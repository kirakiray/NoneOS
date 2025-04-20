import { connect } from "../../user/connection/main.js";
import { RemoteDirHandle } from "./dir.js";
import "./public.js";

export const createGet = (userId, { userDirName, selfTabId } = {}) => {
  userDirName = userDirName || "main";

  // 基础连接器
  const connection = connect({
    userDirName,
    selfTabId,
    userId,
  });

  return async (path, options) => {
    try {
      // 等待连接建立
      await connection.watchUntil(
        () =>
          connection.state === "ready" || connection.state === "not-find-user",
        10000
      );
    } catch (e) {
      console.error(e);
      throw new Error("请求超时，无法连接到该设备");
    }

    if (connection.state === "not-find-user") {
      throw new Error(`Not find user ${userId}`);
    }

    const pathArr = path.split("/");

    const rootDirHandle = new RemoteDirHandle({
      connection,
      path: pathArr[0],
      userDirName,
      remoteUserId: userId,
    });

    if (pathArr.length === 1) {
      return rootDirHandle;
    }

    return rootDirHandle.get(pathArr.slice(1).join("/"), options);
  };
};
