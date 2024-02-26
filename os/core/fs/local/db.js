let allDB = {};
export const getRandomId = () => Math.random().toString(36).slice(2);

export const getDB = async (dbName = "noneos_fs_defaults") => {
  if (!allDB[dbName]) {
    allDB[dbName] = new Promise((resolve) => {
      // 根据id获取数据库
      const req = indexedDB.open(dbName);

      req.onsuccess = (e) => {
        const db = e.target.result;

        db.onclose = () => {
          allDB[dbName] = null;
        };

        resolve(db);
      };

      // 创建时生成仓库
      req.onupgradeneeded = (e) => {
        // 为该数据库创建一个对象仓库
        const db = e.target.result;
        const mainStore = db.createObjectStore("main", { keyPath: "key" });
        mainStore.createIndex("parent", "parent", { unique: false });
        mainStore.createIndex("fileHash", "fileHash", { unique: false }); // 文件hash引用

        // 存储普通文件的表
        db.createObjectStore("files", { keyPath: "hash" });
      };

      req.onerror = (event) => {
        throw {
          desc: dbName + " creation error",
          event,
        };
      };
    });
  }

  return allDB[dbName];
};

export const getData = async ({
  dbName,
  storeName = "main",
  keyName,
  key,
  all = false,
}) => {
  const db = await getDB(dbName);

  return new Promise((resolve, reject) => {
    const store = db
      .transaction([storeName], "readonly")
      .objectStore(storeName);

    let req = store;

    if (keyName) {
      req = req.index(keyName);
    }

    if (all) {
      req = req.getAll(key);
    } else {
      req = req.get(key);
    }

    req.onsuccess = (e) => {
      resolve(e.target.result);
    };

    req.onerror = (e) => {
      reject(e);
    };
  });
};

export const find = async (
  { dbName, storeName = "main", keyName, key },
  callback
) => {
  const db = await getDB(dbName);

  return new Promise((resolve, reject) => {
    const store = db
      .transaction([storeName], "readonly")
      .objectStore(storeName);

    let req;

    if (keyName) {
      req = store.index(keyName).openCursor(IDBKeyRange.only(key));
    } else {
      req = store.openCursor(IDBKeyRange.only(key));
    }

    req.onsuccess = async (e) => {
      let cursor = req.result;
      if (cursor) {
        const result = await callback(cursor.value);

        if (result) {
          resolve(cursor.value);
          return;
        }

        cursor.continue(); // 继续下一个匹配的数据
      } else {
        resolve(null);
      }
    };

    req.onerror = (e) => {
      reject(e);
    };
  });
};

export const setData = async ({
  dbName,
  storeName = "main",
  datas,
  removes,
}) => {
  if (!datas?.length && !removes?.length) {
    return true;
  }

  const db = await getDB(dbName);

  return new Promise((resolve, reject) => {
    let transaction = db.transaction([storeName], "readwrite");

    transaction.oncomplete = (e) => {
      resolve(true);
    };
    transaction.onerror = (e) => {
      reject(e);
    };

    const store = transaction.objectStore(storeName);
    datas && datas.length && datas.forEach((item) => store.put(item));
    removes && removes.length && removes.forEach((item) => store.delete(item));
  });
};
