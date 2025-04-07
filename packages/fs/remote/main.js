import { connect } from "../../user/connection/main.js";
import { RemoteDirHandle } from "./dir.js";
import "./public.js";

export const createGet = (userId, { userDirName } = {}) => {
  // 基础连接器
  const connection = connect({
    userDirName,
    userId,
  });

  return async (path, options) => {
    const pathArr = path.split("/");

    const rootDirHandle = new RemoteDirHandle({
      connection,
      name: pathArr[0],
    });

    if (pathArr.length === 1) {
      return rootDirHandle;
    }

    return rootDirHandle.get(pathArr.slice(1).join("/"), options);
  };
};
