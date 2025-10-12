import { RemoteDirHandle } from "./dir.js";

export const createGet = ({ remoteUser }) => {
  return async (path, options) => {
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
