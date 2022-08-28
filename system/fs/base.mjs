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
      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files", { keyPath: "fid" });
      }
    };

    req.onerror = (event) => {
      console.error("database creation error", event);
      reject("database creation error");
    };
  });

  filedb.onclose = () => {
    filedb = null;
  };

  return filedb;
};

// 直接写入db
export const writeDB = async (opts) => {
  // const item = {
  //   operation: "put",
  //   data: {
  //     // 类型
  //     type: opts.type, // file 文件类型；folder 文件夹类型；
  //     // 保存内容
  //     content: [],
  //     // 文件专属id
  //     fid: opts.fid,
  //   },
  //   options:{
  //     headers: {}
  //   }
  // };

  const db = await getFileDB();

  return new Promise((resolve, reject) => {
    const transicator = db.transaction("files", "readwrite");

    transicator.oncomplete = () => {
      resolve(true);
    };

    transicator.onerror = (event) => {
      const errDesc = `write database error`;
      console.error(errDesc, event);
      reject(errDesc);
    };

    const objectStore = transicator.objectStore("files");

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

// 直接读取db
export const readDB = async (fid) => {
  const db = await getFileDB();

  return new Promise((resolve, reject) => {
    let req = db.transaction("files", "readonly").objectStore("files").get(fid);

    req.onsuccess = (e) => {
      resolve(e.target.result);
    };
    req.onerror = (event) => {
      const errDesc = `read database error`;
      console.error(errDesc, event);
      reject(errDesc);
    };
    req.onclose = () => {
      console.warn("db close => ", req);
    };
  });
};

let isInitedRoot = false;
let initingPms;

// 没有初始化的情况下，进行根目录初始化
export const initRoot = async () => {
  if (isInitedRoot) {
    await initingPms;
    return;
  }

  const rootInfo = await readDB("/");

  // root初始化
  if (!rootInfo) {
    initingPms = writeDB([
      {
        data: {
          fid: "/",
          type: "folder",
          content: {},
        },
      },
    ]);

    await initingPms;

    isInitedRoot = true;
  }
};
