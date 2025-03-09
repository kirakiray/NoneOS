// 主体数据库对象
let mainDB = null;

// 获取数据库
const getDB = async () => {
  if (!mainDB) {
    mainDB = new Promise((resolve, reject) => {
      const request = indexedDB.open("noneos_fs_db", 1);

      request.onupgradeneeded = function (event) {
        const db = event.target.result;
        const objectStore = db.createObjectStore("files", {
          keyPath: "id",
        });
        objectStore.createIndex("parent", "parent", { unique: false });
        objectStore.createIndex("name", "name", { unique: false });
        objectStore.createIndex("parentAndName", ["parent", "name"], {
          // 父文件夹下只能有一个同名文件夹或文件
          unique: true,
        });
      };

      request.onsuccess = function (event) {
        const db = event.target.result;
        resolve(db);
      };

      request.onerror = function (event) {
        reject(event.target.error);
        mainDB = null;
      };
    });
  }

  return mainDB;
};

// 从数据库中获取数据
export const getData = async ({ indexName, index, method = "get" }) => {
  const db = await getDB();

  let request = db.transaction(["files"], "readonly").objectStore("files");

  if (indexName) {
    request = request.index(indexName);
  }

  return new Promise((resolve, reject) => {
    request = request[method](index);

    request.onsuccess = function (event) {
      resolve(event.target.result);
    };

    request.onerror = function (event) {
      reject(event.target.error);
    };
  });
};

// 向数据库中设置数据
export const setData = async ({ puts, deletes }) => {
  const db = await getDB();

  const transaction = db.transaction(["files"], "readwrite");

  const objectStore = transaction.objectStore("files");

  return new Promise((resolve, reject) => {
    // 存储所有put操作的ID
    const putIds = [];

    transaction.oncomplete = function () {
      // 完成时返回所有成功操作的ID
      resolve(putIds);
    };

    transaction.onerror = function (event) {
      reject(event.target.error);
    };

    puts &&
      puts.forEach((data) => {
        objectStore.put(data);
      });

    deletes &&
      deletes.forEach((data) => {
        objectStore.delete(data);
      });
  });
};

// 生成随机文件id
export function getRandomId(length = 10) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => ("0" + byte.toString(32)).slice(-2)).join(
    ""
  );
}
