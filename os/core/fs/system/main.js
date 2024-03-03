import { NDirHandle } from "../system/handle.js";

export const otherHandles = [];

// 通过打开浏览器选择目录
export const open = async () => {
  if (window.showDirectoryPicker) {
    const oriHandle = await window.showDirectoryPicker({});

    const handle = new NDirHandle(oriHandle, [oriHandle.name]);

    otherHandles.push({
      name: handle.name,
      handle,
    });

    return handle;
  }

  throw "showDirectoryPicker does not exist";
};

export const get = async (path, options) => {
  const rootDir = await navigator.storage.getDirectory();

  const rootHandle = await new NDirHandle(rootDir, [rootDir.name]);

  if (!path) {
    return rootHandle;
  }

  return rootHandle.get(path, options);
};
