let initedRes;
const initedPms = new Promise((res) => (initedRes = res));
const ISIGNORE = Symbol("ignore");

// 没有初始化的情况下，进行根目录初始化
export const initRoot = async () => {
  const rootInfo = await readDirDB("/", ISIGNORE);

  // root初始化
  if (!rootInfo) {
    await writeDirDB(
      [
        {
          data: {
            path: "/",
            content: {},
          },
        },
      ],
      ISIGNORE
    );
  }

  initedRes();
};

let filedb;

const getFileDB = async () => {
  if (filedb) {
    return filedb;
  }

  filedb = await new Promise((resolve, reject) => {
    // 根据id获取数据库
    let req = indexedDB.open("noneos_files");

    req.onsuccess = (e) => {
      //获取数据库
      let db = e.target.result;

      db.onclose = () => {
        console.log("db onclose => ", db);
      };

      resolve(db);
    };

    // 创建时生成仓库
    req.onupgradeneeded = (e) => {
      // 保存 IDBDataBase 接口
      let db = e.target.result;

      // 为该数据库创建一个对象仓库
      if (!db.objectStoreNames.contains("file")) {
        db.createObjectStore("file", { keyPath: "fid" });
      }
      if (!db.objectStoreNames.contains("folder")) {
        db.createObjectStore("folder", { keyPath: "path" });
      }
    };

    req.onerror = (event) => {
      console.error("database error", event);
      throw "Database creation error";
    };
  });

  filedb.onclose = () => {
    filedb = null;
  };

  return filedb;
};

// 生成直接写入DB的方法
const initWriteDB = (name) => {
  return async (opts, ignoreInit) => {
    // const item = {
    //   operation: "put",
    //   data: {
    //     // 文件专属id
    //     fid: opts.fid,
    //     // 目录地址
    //     path:''
    //     // 保存内容
    //     content: [],
    //   }
    // };

    if (ignoreInit !== ISIGNORE) {
      await initedPms;
    }

    const db = await getFileDB();

    return new Promise((resolve, reject) => {
      const transicator = db.transaction(name, "readwrite");

      transicator.oncomplete = () => {
        resolve(true);
      };

      transicator.onerror = (err) => {
        reject(err);
      };

      const objectStore = transicator.objectStore(name);

      // 直接写入文件
      opts.forEach((e) => {
        let { operation, data } = e;
        if (operation !== "delete") {
          data = {
            time: Date.now(),
            ...data,
          };
        }
        objectStore[operation || "put"](data);
      });
    });
  };
};

const initReadDB = (name) => {
  return async (mainKey, ignoreInit) => {
    if (ignoreInit !== ISIGNORE) {
      await initedPms;
    }

    const db = await getFileDB();

    return new Promise((resolve, reject) => {
      let req = db.transaction(name, "readonly").objectStore(name).get(mainKey);

      req.onsuccess = (e) => {
        resolve(e.target.result);
      };
      req.onerror = (err) => {
        reject(err);
      };
      req.onclose = () => {
        console.warn("db close => ", req);
      };
    });
  };
};

export const writeFileDB = initWriteDB("file");
export const readFileDB = initReadDB("file");
export const writeDirDB = initWriteDB("folder");
export const readDirDB = initReadDB("folder");

initRoot();
