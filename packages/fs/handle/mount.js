import { DirHandle } from "./dir.js";

export const mount = async (options) => {
  if (!window.showDirectoryPicker) {
    throw new Error("showDirectoryPicker is not supported");
  }

  const mode = options?.mode || "readwrite";

  // 打开文件选择器
  const directoryHandle = await window.showDirectoryPicker({
    mode,
  });

  //   const uniqueId = await directoryHandle.getUniqueId();
  //   console.log("uniqueId", uniqueId);

  const dirHandle = new DirHandle(directoryHandle);

  return dirHandle;
};
