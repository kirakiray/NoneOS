// 主体数据库对象
let mainDB = null;

// 获取数据库
export const getDB = async () => {
  // 如果数据库连接不存在或已失效，重新创建连接
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

      let retryCount = 0;
      const maxRetries = 3;

      const attemptConnection = () => {
        request.onsuccess = function (event) {
          const db = event.target.result;

          // 统一处理数据库事件的函数
          const handleDBEvent = (eventType, error = null) => {
            if (error) {
              console.error(`数据库${eventType}:`, error);
            }
            db.close();
            if (mainDB === db) {
              mainDB = null;
            }
          };

          // 事务中止处理
          db.onabort = (e) => handleDBEvent("事务中止", e.target.error);

          // 事务阻塞处理
          db.onblocked = (e) => handleDBEvent("事务被阻塞", e.target.error);

          // 数据库关闭处理
          db.onclose = () => handleDBEvent("关闭");

          // 数据库错误处理
          db.onerror = () => handleDBEvent("错误", db);

          // 数据库版本变化处理
          db.onversionchange = () => handleDBEvent("版本变化");

          resolve(db);
        };

        request.onerror = function (event) {
          retryCount++;
          if (retryCount < maxRetries) {
            console.warn(`数据库连接失败，正在进行第${retryCount}次重试`);
            setTimeout(attemptConnection, 1000 * retryCount); // 递增重试延迟
          } else {
            console.error("数据库连接失败，已达到最大重试次数");
            reject(event.target.error);
            mainDB = null;
          }
        };
      };

      attemptConnection();
    });
  }

  try {
    // 尝试获取数据库连接
    const db = await mainDB;
    // 测试数据库连接是否有效
    if (db.objectStoreNames.length === 0) {
      mainDB = null;
      return getDB();
    }
    return db;
  } catch (error) {
    // 如果获取失败，清空连接并重试
    mainDB = null;
    return getDB();
  }
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
