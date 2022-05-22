// 主体要写入的表
export const filedb = new Promise((resolve, reject) => {
  // 根据id获取数据库
  let req = indexedDB.open("noneos_files");

  req.onsuccess = (e) => {
    //获取数据库
    let db = e.target.result;

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
    throw "Database creation error";
  };
});

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
  // };

  const db = await filedb;

  return new Promise((resolve, reject) => {
    const transicator = db.transaction("files", "readwrite");

    transicator.oncomplete = () => {
      resolve(true);
    };

    transicator.onerror = (err) => {
      reject(err);
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
  const db = await filedb;

  return new Promise((resolve, reject) => {
    let req = db.transaction("files", "readonly").objectStore("files").get(fid);

    req.onsuccess = (e) => {
      resolve(e.target.result);
    };
    req.onerror = (err) => {
      reject(err);
    };
  });
};


// 获取随机id
export const createFid = (() => {
  if (globalThis.crypto && crypto.randomUUID) {
    return crypto.randomUUID.bind(crypto);
  }
  return () =>
    Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((e) => e.toString(16))
      .join("");
})();