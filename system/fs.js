(() => {
  // 获取随机id
  const createFid = (() => {
    if (globalThis.crypto && crypto.randomUUID) {
      return crypto.randomUUID.bind(crypto);
    }
    return () =>
      Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((e) => e.toString(16))
        .join("");
  })();

  // 主体要写入的表
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
      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files", { keyPath: "fid" });
      }
    };

    req.onerror = (event) => {
      throw "Database creation error";
    };
  });

  // 直接写入db
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

    return new Promise((resolve, reject) => {
      const transicator = db.transaction("files", "readwrite");

      transicator.oncomplete = () => {
        resolve(true);
      };

      transicator.onerror = (err) => {
        debugger;
        reject(err);
      };

      const objectStore = transicator.objectStore("files");

      // 直接写入文件
      opts.forEach((data) => objectStore.put(data));
    });
  };

  // 直接读取db
  const readDB = async (fid) => {
    const db = await filedb;

    return new Promise((resolve, reject) => {
      let req = db
        .transaction("files", "readonly")
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

  // 直接从db删除
  const removeDB = async (fid) => {
    const db = await filedb;

    return new Promise((resolve, reject) => {
      let req = db
        .transaction(["files"], "readwrite")
        .objectStore("files")
        .delete(fid);

      req.onsuccess = (e) => {
        resolve(e.target.result);
      };
      req.onerror = (err) => {
        reject(err);
      };
    });
  };

  // 没有初始化的情况下，进行根目录初始化
  const initRoot = async () => {
    const rootInfo = await readDB("/");

    // root初始化
    if (!rootInfo) {
      await writeDB([
        {
          fid: "/",
          type: "folder",
          content: {},
        },
      ]);
    }
  };

  // 根据 path 获取 路径 和 文件名
  const getName = (path) => {
    const dir = path.replace(/(.*\/).+/, "$1");
    const name = path.replace(/.*\/(.+)/, "$1");
    return { dir, name };
  };

  // 通用写入 data 方法
  const writeData = async ({ dir, name, type, data }) => {
    const dirArr = dir.split("/").filter((e) => !!e);

    let targetFolder = await readDB("/");

    let cata = "/";
    while (dirArr.length) {
      let nextDir = dirArr.shift();
      cata += nextDir;

      let nextData = targetFolder.content[nextDir];

      if (!nextData) {
        throw `${cata} does not exist`;
      }

      targetFolder = await readDB(nextData.fid);
    }

    const targetFolderContent = targetFolder.content;

    const contentTarget = targetFolderContent[name];
    if (contentTarget) {
      if (contentTarget.type === "folder") {
        throw `'${name}' folder already exists`;
      } else {
        await removeDB(contentTarget.fid);
      }
    }

    const fid = createFid();

    const newData = {
      fid,
      type,
      content: data,
    };

    targetFolderContent[name] = {
      fid,
      type,
    };

    // 写入数据
    await writeDB([newData, targetFolder]);
  };

  // 添加文件夹
  const mkdir = async (path) => {
    const { dir, name } = getName(path);

    return await writeData({
      dir,
      name,
      type: "folder",
      data: {},
    });
  };

  const writeFile = async (path, data) => {
    const { dir, name } = getName(path);

    return await writeData({
      dir,
      name,
      type: "file",
      data,
    });
  };

  const fs = {
    inited: initRoot(),
    mkdir,
    writeFile,
  };

  globalThis.fs = fs;
})();
