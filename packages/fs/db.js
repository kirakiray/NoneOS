import { getErr } from "./errors.js";

const allDB = {};
// export const getRandomId = () => Math.random().toString(36).slice(2);
export function getRandomId(length = 10) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => ("0" + byte.toString(32)).slice(-2)).join(
    ""
  );
}

/**
 * 获取目标数据库
 * @param {String} dbName 目标数据库名
 * @returns {Promise<IDBDatabase>}
 */
export const getDB = async (dbName = "noneos_fs_defaults") => {
  if (!allDB[dbName]) {
    allDB[dbName] = new Promise((resolve) => {
      // 根据id获取数据库
      const req = indexedDB.open(dbName);

      req.onsuccess = async (e) => {
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

        // 文件夹存储数据用的表
        const mainStore = db.createObjectStore("main", { keyPath: "key" });

        // 用于搜索制定文件夹下的所有子文件
        mainStore.createIndex("parent", "parent", {
          unique: false,
        });

        // 以父key和name作为索引，用于获取特定文件
        mainStore.createIndex("parent_and_name", ["parent", "name"], {
          // 父文件夹下只能有一个同名文件夹或文件
          unique: true,
        });

        // 用于判断文件的块是否有重复出现，如果没有重复出现，在覆盖的时候删除blocks中的对应数据
        mainStore.createIndex("hash", "hash", {
          unique: false,
        });

        // 存储文件的表
        db.createObjectStore("blocks", {
          keyPath: "hash",
        });
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

/**
 * 获取指定存储中的索引
 * @param {Object} options - 配置选项
 * @param {string} options.storename - 存储名称
 * @param {string} [options.index] - 索引名称
 * @param {string} options.dbname - 数据库名称
 * @returns {IDBRequest} 返回一个 IDBRequest 对象，用于操作存储
 */
const getIndex = async ({ storename, index, dbname }) => {
  const db = await getDB(dbname);

  let req = db.transaction([storename], "readonly").objectStore(storename);

  if (index) {
    try {
      req = req.index(index);
    } catch (err) {
      throw getErr(
        "indexErr",
        {
          dbname,
          storename,
          key: index,
        },
        err
      );
    }
  }

  return req;
};

/**
 * 获取数据
 * @param {Object} options - 配置选项
 * @param {string} [options.dbname="noneos_fs_defaults"] - 数据库名称
 * @param {string} [options.storename="main"] - 存储名称
 * @param {string} options.index - 索引，'key'为索引值（不需要设置默认值为'key'）
 * @param {boolean} [options.all=false] - 是否获取所有数据
 * @param {string} [options.method='get'] - 索引时使用的方法，'get'或'getAll'或'count'
 * @param {string} options.key - 键
 * @returns {Promise<string>} 返回数据
 */
export const getData = async ({
  dbname = "noneos_fs_defaults",
  storename = "main",
  index,
  all = false,
  method = "get",
  key,
}) => {
  let req = await getIndex({ storename, index, dbname });

  if (!req[method]) {
    throw getErr("storeNotExistMethod", {
      method,
    });
  }

  return new Promise((resolve, reject) => {
    req = req[method](key);
    req.onsuccess = (e) => {
      resolve(e.target.result);
    };

    req.onerror = (e) => {
      reject(getErr("getDataErr", null, e.target.error));
    };
  });
};

/**
 * 查找数据
 * @param {Object} options - 配置选项
 * @param {string} [options.dbname="noneos_fs_defaults"] - 数据库名称
 * @param {string} [options.storename="main"] - 存储名称
 * @param {string} [options.index] - 索引名称
 * @param {Function} options.callback - 用于处理每个游标值的回调函数
 * @param {string} options.key - 要查找的键
 * @returns {Promise<Object|null>} 返回一个 Promise，解析为找到的对象或 null
 */
export const findData = async ({
  dbname = "noneos_fs_defaults",
  storename = "main",
  index,
  callback,
  key,
}) => {
  let req = await getIndex({ storename, index, dbname });

  return new Promise((resolve, reject) => {
    req = req.openCursor(IDBKeyRange.only(key));

    req.onsuccess = (e) => {
      let cursor = req.result;
      if (cursor) {
        // 😒 游标在同步线程结束后会自动回收，是伪装成异步代码的同步状态的api
        // 所以这里不使用 async function 做 callback 的回调函数
        const result = callback(cursor.value);

        if (result) {
          if (result.advance) {
            cursor.advance(result.advance);
          } else {
            resolve(cursor.value);
            return;
          }
        }

        cursor.continue();
      } else {
        resolve(null);
      }
    };

    req.onerror = (e) => {
      reject(getErr("findDataErr", null, e.target.error));
    };
  });
};

/**
 * 设置数据
 * @param {Object} options - 配置选项
 * @param {string} [options.dbname="noneos_fs_defaults"] - 数据库名称
 * @param {string} [options.storename="main"] - 存储名称
 * @param {Array} options.datas - 要添加或更新的数据数组
 * @param {Array} options.removes - 要删除的数据数组
 * @returns {Promise<boolean>} 返回一个 Promise，表示操作是否成功
 */
export const setData = async ({
  dbname = "noneos_fs_defaults",
  storename = "main",
  datas,
  removes,
}) => {
  if (!datas?.length && !removes?.length) {
    return true;
  }

  const db = await getDB(dbname);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storename], "readwrite");

    transaction.oncomplete = (e) => {
      resolve(true);
    };
    transaction.onerror = (e) => {
      reject(getErr("setDataErr", null, e.target.error));
    };

    const store = transaction.objectStore(storename);
    datas && datas.length && datas.forEach((item) => store.put(item));
    removes && removes.length && removes.forEach((key) => store.delete(key));
  });
};
