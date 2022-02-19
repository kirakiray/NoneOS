(async () => {
  // 获取随机id
  const getUid = (() => {
    if (window.crypto && crypto.randomUUID) {
      return crypto.randomUUID.bind(crypto);
    }
    return () =>
      Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((e) => e.toString(16))
        .join("");
  })();

  const filedb = new Promise((resolve, reject) => {
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
      db.createObjectStore("main", { keyPath: "fid" });
    };

    req.onerror = (event) => {
      throw {
        desc: "数据创建出错",
        event,
      };
    };
  });

  // 写入文件
  const write = async (opts) => {
    // const defs = {
    //     // 路径
    //     path: "",
    //     // 类型
    //     type: "file", // folder 文件夹类型；
    //     // 保存内容
    //     content: ""
    // };

    const db = await filedb;

    return new Promise((resolve, reject) => {
      let req = db
        .transaction(["main"], "readwrite")
        .objectStore("main")
        .put(opts);

      req.onsuccess = (e) => {
        resolve(true);
      };
      req.onerror = (err) => {
        reject(err);
      };
    });
  };

  const fs = { write };

  window.fs = fs;
  window.getUid = getUid;
})();
