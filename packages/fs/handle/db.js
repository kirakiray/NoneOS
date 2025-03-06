import { getErr } from "../errors.js";

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
    allDB[dbName] = new Promise((resolve, reject) => {
      // 根据id获取数据库
      const req = indexedDB.open(dbName);

      req.onsuccess = async (e) => {
        const db = e.target.result;

        db.onclose = () => {
          allDB[dbName] = null;
        };

        resolve(db);
        reject = null;

        // setTimeout(() => {
        //   allDB[dbName] = null;
        //   db.close();
        // }, 10000);
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
        allDB[dbName] = null;
        const err = new Event(dbName + " creation error", {
          cause: event.error,
        });

        if (reject) {
          reject(err);
        } else {
          throw err;
        }
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

// 写入中的记录器
// 确保同时写入目录时，id不一致的问题
const writingMap = new Map();

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
      // 写入完成后，清除临时缓存的数据
      datas &&
        datas.forEach((item) => {
          if (item.parent) {
            writingMap.delete(`${item.parent}-${item.name}`);
          }
        });

      transaction.onerror = null;
      resolve(true);
    };
    transaction.onerror = (e) => {
      console.log("transaction error : ", {
        event: e,
        transaction,
        setData: {
          dbname,
          storename,
          datas,
          removes,
        },
      });
      reject(getErr("setDataErr", null, e.target.error));
    };

    const store = transaction.objectStore(storename);
    datas &&
      datas.forEach((item) => {
        if (item.parent) {
          const result = writingMap.get(`${item.parent}-${item.name}`);

          if (result) {
            const saveingItem = result;

            // 合并到原数据上，防止目录数据重复
            Object.assign(item, saveingItem);
          } else {
            // 写入过程中，缓存写入文件的信息，防止文件夹重复写入
            writingMap.set(`${item.parent}-${item.name}`, item);
          }
        }

        store.put(item);
      });
    removes && removes.length && removes.forEach((key) => store.delete(key));
  });
};
