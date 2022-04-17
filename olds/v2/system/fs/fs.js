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

  // 没有初始化的情况下，进行根目录初始化
  const initRoot = async () => {
    const rootInfo = await readDB("/");

    // root初始化
    if (!rootInfo) {
      await writeDB([
        {
          fid: "/",
          // name: "/",
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

  // 删除数据
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

    let inDir = "";
    while (index <= lastIndex) {
      const name = pathArr[index];
      inDir += "/" + name;
      const subData = parentDirData.content[name];
      if (!subData) {
        throw `error path:${path}, ${inDir} does not exist`;
      }
      parentDirData = await readDB(subData.fid);
      index++;
    }

    return parentDirData;
  };

  const getName = (path) => {
    const dir = path.replace(/(.*\/).+/, "$1");
    const name = path.replace(/.*\/(.+)/, "$1");
    return { dir, name };
  };

  // 正在写入数据
  const writing = {};

  const waitWrite = (dir) => {
    let targetPms = writing[dir] || (writing[dir] = Promise.resolve());

    let resolve;

    const pms = new Promise((res) => {
      resolve = res;
    });

    writing[dir] = targetPms.then((e) => pms);

    return {
      pms: targetPms,
      resolve,
    };
  };

  // 写入数据
  const writeData = async (path, type, data, existedCall) => {
    const { dir, name } = getName(path);

    const { pms, resolve } = waitWrite(dir);

    await pms;

    const parentDirData = await readPathDB(dir);

    const parentDirContent = parentDirData.content;

    // 确定没有重复
    if (parentDirContent[name]) {
      await existedCall(path, parentDirContent[name]).catch((e) => {
        resolve();
        throw e;
      });
    }

    // 写入文件夹
    const fid = createFid();

    const contentData = (parentDirContent[name] = {
      type,
      fid,
      date: Date.now(),
    });

    const realData = {
      ...contentData,
      content: data,
    };

    await writeDB([realData, parentDirData]);

    resolve();

    return true;
  };

  // ----暴露到外面的方法↓----
  const DEEPREMOVE = Symbol("deep-remove");
  const remove = async (path, isDeep) => {
    const { dir, name } = getName(path);

    const dirData = await readPathDB(dir);
    const dirContent = dirData.content;
    const dirContentTarget = dirContent[name];

    if (!dirContentTarget) {
      throw `${path} not found,remove fail`;
    }

    if (dirContentTarget.type === "folder") {
      const targetData = await readDB(dirContentTarget.fid);

      if (!targetData) {
        debugger;
      }

      // 删除子文件
      await Promise.all(
        Object.entries(targetData.content).map(async ([name, e]) => {
          let newPath = `${path}/${name}`;

          await remove(newPath, DEEPREMOVE);
        })
      );

      await removeDB(dirContentTarget.fid);
    } else {
      // 直接删除
      await removeDB(dirContentTarget.fid);
    }

    if (isDeep !== DEEPREMOVE) {
      delete dirContent[name];
      await writeDB([dirData]);
    }
  };

  // 添加文件夹
  const mkdir = async (path) => {
    return await writeData(path, "folder", {}, async (path) => {
      throw `${path} already exists`;
    });
  };

  const writeFile = async (path, data) => {
    return await writeData(path, "data", data, async (path, existedData) => {
      await remove(path);
    });
  };

  const rename = async (opts) => {
    debugger;
  };

  // 读取文件
  const read = async (path) => {
    const targetData = await readPathDB(path);

    if (!targetData) {
      return;
    }

    let { content } = targetData;

    if (targetData.type === "folder") {
      content = Object.entries(content).map((e) => ({
        name: e[0],
        ...e[1],
      }));
    }

    return {
      type: targetData.type,
      content,
    };
  };

  // 写入文件
  const write = async (opt) => {
    // opt = {
    //   type: "file", // file folder data
    //   path: "",
    //   content: "",
    // };
  };

  const fs = {
    mkdir,
    read,
    writeFile,
    remove,
    rename,
    readById: readDB,
    inited: initRoot(),
  };

  globalThis.fs = fs;
})();
