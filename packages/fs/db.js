import { getErr } from "./errors.js";

const allDB = {};

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

      req.onsuccess = (e) => {
        const db = e.target.result;

        db.onclose = () => {
          allDB[dbName] = null;
        };

        // 首先写入一个Local的根目录

        resolve(db);
      };

      // 创建时生成仓库
      req.onupgradeneeded = (e) => {
        // 为该数据库创建一个对象仓库
        const db = e.target.result;

        // 文件夹存储数据用的表
        const mainStore = db.createObjectStore("main", { keyPath: "key" });
        // 文件或文件夹的父id
        mainStore.createIndex("parent", "parent", { unique: false });
        // 文件的哈希值数组
        mainStore.createIndex("hashs", "hashs", { unique: false });

        // 存储文件的表
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

/**
 * 获取数据
 * @param {Object} options - 配置选项
 * @param {string} [options.dbname="noneos_fs_defaults"] - 数据库名称
 * @param {string} [options.storename="main"] - 存储名称
 * @param {string} options.index - 索引，'key'为索引值（不需要设置默认值为'key'）
 * @param {boolean} [options.all=false] - 是否获取所有数据
 * @param {string} options.key - 键
 * @returns {Promise<string>} 返回数据
 */
export const getData = async ({
  dbname = "noneos_fs_defaults",
  storename = "main",
  index,
  all = false,
  key,
}) => {
  const db = await getDB(dbname);

  return new Promise((resolve, reject) => {
    let req = db.transaction([storename], "readonly").objectStore(storename);

    if (index) {
      try {
        req = req.index(index);
      } catch (err) {
        reject(
          getErr(
            "indexErr",
            {
              dbname,
              storename,
              key: index,
            },
            err
          )
        );
      }
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
    let transaction = db.transaction([storename], "readwrite");

    transaction.oncomplete = (e) => {
      resolve(true);
    };
    transaction.onerror = (e) => {
      reject(e);
    };

    const store = transaction.objectStore(storename);
    datas && datas.length && datas.forEach((item) => store.put(item));
    removes && removes.length && removes.forEach((item) => store.delete(item));
  });
};
