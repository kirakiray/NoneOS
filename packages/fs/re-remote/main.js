import { RemoteDirHandle } from "./dir.js";
import { initialized } from "./base.js";

export const createGet = ({ remoteUser }) => {
  return async (path, options) => {
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
