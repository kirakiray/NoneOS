import { RemoteDirHandle } from "./dir.js";
import { initialized } from "./base.js";

export const createGet = ({ remoteUser }) => {
  return async (path, options) => {
    if (remoteUser.mode === 0) {
      // 用户不在线，没有连上对方用户
      throw new Error(`远程用户不在线，无法访问路径: ${path}`);
    }

    await initialized;
    const [rootName, ...restParts] = path.split("/");
    const remainingPath = restParts.join("/");

    const handle = new RemoteDirHandle({
      path: rootName,
      remoteUser,
    });

    if (!restParts.length) {
      return handle;
    }

    return handle.get(remainingPath, options);
  };
};
