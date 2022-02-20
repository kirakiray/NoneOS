(async () => {
  // 获取随机id
  const createFid = (() => {
    if (window.crypto && crypto.randomUUID) {
      return crypto.randomUUID.bind(crypto);
    }
    return () =>
      Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((e) => e.toString(16))
        .join("");
  })();

  // 没有初始化的情况下，进行根目录初始化
  const initRoot = async () => {
    const rootInfo = await readDB("/");

    // root初始化
    if (!rootInfo) {
      await writeDB([
        {
          fid: "/",
          name: "/",
          type: "folder",
          content: {},
        },
      ]);
    }
  };

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
      db.createObjectStore("files", { keyPath: "fid" });
      // db.createObjectStore("map", { path: "fid" });
    };

    req.onerror = (event) => {
      throw {
        desc: "数据创建出错",
        event,
      };
    };
  });

  // 添加文件或文件夹
  const writeDB = async (opts) => {
    // const item = {
    //   // 类型
    //   type: opts.type, // file 文件类型；folder 文件夹类型；
    //   // 保存内容
    //   content: [],
    //   // 文件专属id
    //   fid: opts.fid,
    // };
    const db = await filedb;

    const objectStore = db
      .transaction(["files"], "readwrite")
      .objectStore("files");

    return Promise.all(
      opts.map(
        (data) =>
          new Promise((resolve, reject) => {
            const req = objectStore.put(data);
            req.onsuccess = (e) => {
              resolve(true);
            };
            req.onerror = (err) => {
              reject(err);
            };
          })
      )
    );
  };

  // 读取文件或文件夹
  const readDB = async (fid) => {
    const db = await filedb;

    return new Promise((resolve, reject) => {
      let req = db
        .transaction(["files"], "readonly")
        .objectStore("files")
        .get(fid);

      req.onsuccess = (e) => {
        resolve(e.target.result);
      };
      req.onerror = (err) => {
        reject(err);
      };
    });
  };

  // 读取文件或目录
  const readPathDB = async (path) => {
    let parentDirData = await readDB("/");

    if (path === "/") {
      return parentDirData;
    }

    path = path.replace(/\/$/, "");
    const pathArr = path.split("/");

    // 去除第一个根目录空白
    if (!pathArr[0]) {
      pathArr.splice(0, 1);
    }
    const lastIndex = pathArr.length - 1;
    let index = 0;

    while (index <= lastIndex) {
      const name = pathArr[index];
      const subData = parentDirData.content[name];
      if (!subData) {
        throw `can not read ${path}`;
      }
      parentDirData = await readDB(subData.fid);
      index++;
    }

    return parentDirData;
  };

  // 添加文件夹
  const mkdir = async (path) => {
    const parentPath = path.replace(/(.*\/).+/, "$1");
    const name = path.replace(/.*\/(.+)/, "$1");

    const parentDirData = await readPathDB(parentPath);

    const { content } = parentDirData;

    // 确定没有重复
    if (content[name]) {
      throw `${path} already exists`;
    }

    // 写入文件夹
    const fid = createFid();
    const subDir = {
      fid,
      name,
      content: {},
    };

    content[name] = {
      type: "folder",
      fid,
      name,
    };

    await writeDB([subDir, parentDirData]);

    return true;
  };

  const rename = async (opts) => {};

  const remove = async (opts) => {};

  const fs = {
    mkdir,
    readPathDB,
    inited: initRoot(),
  };

  window.fs = fs;
})();
