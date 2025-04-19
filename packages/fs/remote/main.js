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
