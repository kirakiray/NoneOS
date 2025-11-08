import { DirHandle } from "./dir.js";

export const mountedDirs = [];

export const mount = async (options) => {
  if (!window.showDirectoryPicker) {
    throw new Error("showDirectoryPicker is not supported");
  }

  const mode = options?.mode || "readwrite";

  // 打开文件选择器
  const directoryHandle = await window.showDirectoryPicker({
    id: options?.id,
    mode,
  });

  const handle = new DirHandle(directoryHandle);

  mountedDirs.push({
    uniqueId: directoryHandle.getUniqueId
      ? await directoryHandle.getUniqueId()
      : Math.random().toString(36).slice(2),
    handle,
  });

  return handle;
};
