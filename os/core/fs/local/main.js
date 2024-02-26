import { DirHandle } from "./handle.js";

const rootHandle = new DirHandle({
  paths: [""],
  kind: "directory",
  dbkey: "root",
});

export const get = (path, options) => {
  if (!path) {
    return rootHandle;
  }

  return rootHandle.get(path, options);
};
