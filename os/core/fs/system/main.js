import { NDirHandle } from "../system/handle.js";

export const otherHandles = [];

// 通过打开浏览器选择目录
export const open = async () => {
  if (window.showDirectoryPicker) {
    const oriHandle = await window.showDirectoryPicker({});

    const handle = new NDirHandle(oriHandle, []);

    otherHandles.push({
      name: handle.name,
      handle,
    });

    return handle;
  }

  throw "showDirectoryPicker does not exist";
};

export const get = async (path, options) => {
  const rootHandle = await new NDirHandle(
    await navigator.storage.getDirectory()
  );

  if (!path) {
    return rootHandle;
  }

  return rootHandle.get(path, options);
};
