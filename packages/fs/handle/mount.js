import { DirHandle } from "./dir.js";

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

// 获取已经挂载的句柄列表
export const getMounted = async () => {
  const allHandles = await getAllHandles();

  // 重新包装
  return allHandles.map((item) => ({
    id: item.id,
    name: item.handle.name,
    handle: new DirHandle(item.handle),
  }));
};

// 保存db相关的操作
// 数据库初始化（只在 keyPath 上加了 'id'）
const dbPromise = new Promise((resolve) => {
  const req = indexedDB.open("handles-db", 1);
  req.onupgradeneeded = () =>
    req.result.createObjectStore("handles", { keyPath: "id" });
  req.onsuccess = () => resolve(req.result);
});

// 保存（自动生成唯一ID，返回ID值）
const saveHandle = async (handle) => {
  const db = await dbPromise;

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
  const db = await dbPromise;
  return new Promise((resolve) => {
    db.transaction("handles").objectStore("handles").getAll().onsuccess = (
      e
    ) => {
      resolve(e.target.result);
    };
  });
};

// // 加载指定ID的句柄
// const loadHandle = async (id) => {
//   const db = await dbPromise;
//   return (await db.transaction("handles").objectStore("handles").get(id))
//     ?.handle;
// };

// 删除指定ID
const deleteHandle = async (id) => {
  const db = await dbPromise;
  await db
    .transaction("handles", "readwrite")
    .objectStore("handles")
    .delete(id);
};
