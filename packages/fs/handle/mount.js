import { DirHandle } from "./dir.js";
import { RESET_PATH } from "../public/base.js";

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

  if (options.save) {
    saveHandle(handle._handle);
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
  const [mark, reRootName] = rootName.split(":");
  const dirId = mark.replace(/\$mount-/, "");

  const _handle = await loadHandle(dirId);

  const handle = new DirHandle(_handle);

  handle[RESET_PATH] = `$mount-${dirId}:${reRootName}`;

  if (pathArr.length === 1) {
    return handle;
  }

  const remainingPath = pathArr.slice(1).join("/");

  return handle.get(remainingPath, options);
};

// 获取已经挂载的句柄列表
export const getMounted = async () => {
  const allHandles = await getAllHandles();

  // 重新包装
  return allHandles.map((item) => {
    const handle = new DirHandle(item.handle);

    handle[RESET_PATH] = `$mount-${item.id}:${item.handle.name}`;

    return {
      id: item.id,
      name: item.handle.name,
      path: handle.path,
      handle,
    };
  });
};

// db相关的操作
let _handleDB = null;
const getHandleDB = async () => {
  if (_handleDB) return _handleDB;

  return new Promise((resolve) => {
    const req = indexedDB.open("handles-db", 1);
    req.onupgradeneeded = () =>
      req.result.createObjectStore("handles", { keyPath: "id" });
    req.onsuccess = () => {
      _handleDB = req.result;
      resolve(req.result);
    };
    req.onerror = (e) => {
      _handleDB = null;
    };
    req.onblocked = () => {
      _handleDB = null;
    };
  });
};

// 保存（自动生成唯一ID，返回ID值）
const saveHandle = async (handle) => {
  const db = await getHandleDB();

  let id;
  if (handle.getUniqueId) {
    id = await handle.getUniqueId();
  } else {
    id = `${handle.kind}-${Date.now()}`;
    const allHandles = await getAllHandles();

    const isSame = allHandles.some((item) => item.handle.isSameEntry(handle));
    if (isSame) {
      // 已经挂载过了
      return;
    }
  }

  await db.transaction("handles", "readwrite").objectStore("handles").put({
    id,
    handle,
    time: Date.now(),
  });

  return id;
};

// 获取所有句柄列表（含ID和名称）
const getAllHandles = async () => {
  const db = await getHandleDB();
  return new Promise((resolve) => {
    db.transaction("handles").objectStore("handles").getAll().onsuccess = (
      e
    ) => {
      resolve(e.target.result);
    };
  });
};

// 加载指定ID的句柄
const loadHandle = async (id) => {
  const db = await getHandleDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction("handles").objectStore("handles").get(id);
    req.onsuccess = (e) => {
      const result = e.target.result;
      resolve(result ? result.handle : null);
    };
    req.onerror = () => {
      reject(req.error);
    };
  });
};

// 删除指定ID
const deleteHandle = async (id) => {
  const db = await getHandleDB();
  await db
    .transaction("handles", "readwrite")
    .objectStore("handles")
    .delete(id);
};
