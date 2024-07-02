import { OriginDirHandle } from "./o-handle/dir.js";

const originInited = (async () => {
  const opfsRoot = await navigator.storage.getDirectory();

  await opfsRoot.getDirectoryHandle("local", {
    create: true,
  });
})();

export const get = async (path, options) => {
  const paths = path.split("/");

  if (!paths.length) {
    throw getErr("pathEmpty");
  }

  if (paths[0] === "") {
    throw getErr("rootEmpty");
  }

  await originInited;

  const opfsRoot = await navigator.storage.getDirectory();

  const localRoot = await opfsRoot.getDirectoryHandle(paths[0], {
    create: true,
  });

  const rootHandle = new OriginDirHandle(localRoot);

  if (paths.length === 1) {
    return rootHandle;
  }

  return rootHandle.get(paths.slice(1).join("/"), options);
};
