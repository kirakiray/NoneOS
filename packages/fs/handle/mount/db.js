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
export const saveHandle = async (handle) => {
  const db = await getHandleDB();

  let id;
  if (handle.getUniqueId) {
    id = await handle.getUniqueId();
  } else {
    id = `${handle.kind}-${Date.now()}`;
    const allHandles = await getAllHandles();

    const isSame = await Promise.all(
      allHandles.map((item) => item.handle.isSameEntry(handle))
    ).then((results) => results.some(Boolean));
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
export const getAllHandles = async () => {
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
export const loadHandle = async (id) => {
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
export const deleteHandle = async (id) => {
  const db = await getHandleDB();
  await db
    .transaction("handles", "readwrite")
    .objectStore("handles")
    .delete(id);
};
