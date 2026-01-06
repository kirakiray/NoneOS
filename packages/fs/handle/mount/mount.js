import { DirHandle } from "../dir.js";
import { RESET_PATH } from "../../public/base.js";
import { saveHandle, loadHandle, deleteHandle, getAllHandles } from "./db.js";

// 检查权限
const checkPermission = async (handle) => {
  try {
    const result = await handle.queryPermission({ mode: "readwrite" });

    if (result !== "granted") {
      // 进行申请权限
      await handle.requestPermission({ mode: "readwrite" });
    }
  } catch (err) {
    throw new Error(`Permission denied: ${err.message}`);
  }
};

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

  await checkPermission(directoryHandle);

  const handle = new DirHandle(directoryHandle);

  if (options?.save) {
    await save(handle);
  }

  return handle;
};

export const save = async (handle) => {
  if (!handle[RESET_PATH]) {
    const id = await saveHandle(handle._handle);

    handle[RESET_PATH] = `$mount-${id}>${encodeURI(handle.name)}`;
  }
  return handle;
};

export const unmount = async (id) => {
  // 确认是存在的句柄
  const handle = await loadHandle(id);
  if (!handle) {
    throw new Error(`Handle ${id} does not exist`);
  }

  return deleteHandle(id);
};

export const get = async (path, options) => {
  const pathArr = path.split("/");
  const rootName = pathArr[0];
  const [mark, reRootName] = rootName.split(">");
  const dirId = mark.replace(/\$mount-/, "");

  const _handle = await loadHandle(dirId);

  await checkPermission(_handle);

  const handle = new DirHandle(_handle);

  handle[RESET_PATH] = `$mount-${dirId}>${encodeURI(reRootName)}`;

  if (pathArr.length === 1) {
    return handle;
  }

  const remainingPath = pathArr.slice(1).join("/");

  return handle.get(remainingPath, options);
};

// 获取已经挂载的句柄列表
export const getMounted = async () => {
  const allHandles = await getAllHandles();

  // 检查权限
  for await (const item of allHandles) {
    await checkPermission(item.handle);
  }

  // 重新包装
  return allHandles.map((item) => {
    const handle = new DirHandle(item.handle);

    handle[RESET_PATH] = `$mount-${item.id}>${encodeURI(item.handle.name)}`;

    return {
      id: item.id,
      name: item.handle.name,
      path: handle.path,
      handle,
    };
  });
};
