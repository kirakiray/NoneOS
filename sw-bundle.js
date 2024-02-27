(function () {
  'use strict';

  let allDB = {};
  const getRandomId = () => Math.random().toString(36).slice(2);

  const getDB = async (dbName = "noneos_fs_defaults") => {
    if (!allDB[dbName]) {
      allDB[dbName] = new Promise((resolve) => {
        // 根据id获取数据库
        const req = indexedDB.open(dbName);

        req.onsuccess = (e) => {
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
          const mainStore = db.createObjectStore("main", { keyPath: "key" });
          mainStore.createIndex("parent", "parent", { unique: false });
          mainStore.createIndex("fileHash", "fileHash", { unique: false }); // 文件hash引用

          // 存储普通文件的表
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

  const getData = async ({
    dbName,
    storeName = "main",
    keyName,
    key,
    all = false,
  }) => {
    const db = await getDB(dbName);

    return new Promise((resolve, reject) => {
      const store = db
        .transaction([storeName], "readonly")
        .objectStore(storeName);

      let req = store;

      if (keyName) {
        req = req.index(keyName);
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

  const find = async (
    { dbName, storeName = "main", keyName, key },
    callback
  ) => {
    const db = await getDB(dbName);

    return new Promise((resolve, reject) => {
      const store = db
        .transaction([storeName], "readonly")
        .objectStore(storeName);

      let req;

      if (keyName) {
        req = store.index(keyName).openCursor(IDBKeyRange.only(key));
      } else {
        req = store.openCursor(IDBKeyRange.only(key));
      }

      req.onsuccess = async (e) => {
        let cursor = req.result;
        if (cursor) {
          const result = await callback(cursor.value);

          if (result) {
            resolve(cursor.value);
            return;
          }

          cursor.continue(); // 继续下一个匹配的数据
        } else {
          resolve(null);
        }
      };

      req.onerror = (e) => {
        reject(e);
      };
    });
  };

  const setData = async ({
    dbName,
    storeName = "main",
    datas,
    removes,
  }) => {
    if (!datas?.length && !removes?.length) {
      return true;
    }

    const db = await getDB(dbName);

    return new Promise((resolve, reject) => {
      let transaction = db.transaction([storeName], "readwrite");

      transaction.oncomplete = (e) => {
        resolve(true);
      };
      transaction.onerror = (e) => {
        reject(e);
      };

      const store = transaction.objectStore(storeName);
      datas && datas.length && datas.forEach((item) => store.put(item));
      removes && removes.length && removes.forEach((item) => store.delete(item));
    });
  };

  const DIR = "directory";

  const calculateHash = async (arrayBuffer) => {
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const centerId = Math.floor(arrayBuffer.byteLength / 2);
    return (
      hashHex +
      new Uint8Array(arrayBuffer.slice(centerId, centerId + 1))[0].toString(16)
    );
  };

  const splitIntoChunks = async (input) => {
    const CHUNK_SIZE = 512 * 1024; // 512KB
    // const CHUNK_SIZE = 1024 * 4; // 4kb
    let arrayBuffer;

    if (typeof input === "string") {
      arrayBuffer = new TextEncoder().encode(input).buffer;
    } else if (input instanceof File) {
      arrayBuffer = await input.arrayBuffer();
    } else if (input instanceof ArrayBuffer) {
      arrayBuffer = input;
    } else {
      throw new Error(
        "Input must be a string, File object or ArrayBuffer object"
      );
    }

    const chunks = [];
    for (let i = 0; i < arrayBuffer.byteLength; i += CHUNK_SIZE) {
      const chunk = arrayBuffer.slice(i, i + CHUNK_SIZE);
      chunks.push(chunk);
    }

    return chunks;
  };

  // 直接写入文件，并返回文件的hash
  const writeContent = async ({ content, process, handle }) => {
    const results = await splitIntoChunks(content);

    const tasks = [];
    let total = results.length;
    let count = 0;

    await Promise.all(
      results.map(async (arrayBuffer, index) => {
        const hash = await calculateHash(arrayBuffer);

        // 判断是否有重复，有重复就不写入了
        const oldBlock = await getData({
          storeName: "files",
          key: hash,
        });

        if (!oldBlock) {
          // 不存在历史数据的情况下写入数据
          await setData({
            storeName: "files",
            datas: [
              {
                hash,
                content: arrayBuffer,
              },
            ],
          });
        }

        tasks.push({
          hash,
          index,
        });

        count++;

        process &&
          process({
            hasOld: !!oldBlock,
            index,
            total,
            count,
          });
      })
    );

    // 拿出旧的和新的对比，多余的块就删除,新增的块就写入；
    const oldKeys = (
      await getData({
        keyName: "parent",
        key: handle.dbkey,
        all: 1,
      })
    ).map((e) => e.key);

    const adds = []; // 需要新添加的块
    const newHashKey = [];

    tasks.forEach(({ hash, index }) => {
      const key = `${handle.dbkey}_${index}_${hash}`;
      newHashKey.push(key);

      if (oldKeys.includes(key)) {
        return;
      }

      adds.push({
        key,
        index,
        type: "block",
        parent: handle.dbkey,
        fileHash: hash,
      });
    });

    const needDelete = [];
    oldKeys.forEach((key) => !newHashKey.includes(key) && needDelete.push(key));

    if (adds.length || needDelete.length) {
      await setData({
        datas: adds,
        removes: needDelete,
      });

      setTimeout(() => {
        clearCache(needDelete.map((key) => key.split("_").slice(-1)[0]));
      }, 100);
    }
  };

  // 清除 files 表上未被使用过的文件块
  const clearCache = async (hashs) => {
    if (!hashs || !hashs.length) {
      return;
    }

    // 查看仓库内是否有其他模块使用相同的hash block，没有的话就直接从 files 中删除
    const reNeedDelete = [];

    await Promise.all(
      hashs.map(async (hash) => {
        const data = await getData({
          keyName: "fileHash",
          key: hash,
        });

        if (!data) {
          // 没有被使用，证明可以删除掉了
          reNeedDelete.push(hash);
        }
      })
    );

    // 没有被使用，证明可以删除掉了
    await setData({
      storeName: "files",
      removes: reNeedDelete,
    });
  };

  function mergeArrayBuffers(buffers) {
    // 计算所有ArrayBuffer的总长度
    let totalLength = buffers.reduce((total, buf) => total + buf.byteLength, 0);

    // 创建一个新的ArrayBuffer和Uint8Array视图
    let mergedBuffer = new ArrayBuffer(totalLength);
    let mergedView = new Uint8Array(mergedBuffer);

    // 将每个ArrayBuffer的内容复制到新的ArrayBuffer中
    let offset = 0;
    for (let buf of buffers) {
      mergedView.set(new Uint8Array(buf), offset);
      offset += buf.byteLength;
    }

    return mergedBuffer;
  }

  const getContent = async ({ handle, ...options }) => {
    const blocksData = await getData({
      keyName: "parent",
      key: handle.dbkey,
      all: 1,
    });

    blocksData.sort((a, b) => a.index - b.index);

    const blocks = await Promise.all(
      blocksData.map(async (item) => {
        const data = await getData({
          storeName: "files",
          key: item.fileHash,
        });

        return data.content;
      })
    );

    switch (options.type) {
      case "file":
        const targetData = await getData({
          key: handle.dbkey,
        });

        return new File(blocks, handle.name, {
          type: targetData.fileType,
          lastModified: targetData.lastModified,
        });
      case "text":
        return blocks.map((buffer) => new TextDecoder().decode(buffer)).join("");
      case "buffer":
        return mergeArrayBuffers(blocks);
    }

    return null;
  };

  const removeFile = async ({ handle }) => {
    const blocks = await getData({
      keyName: "parent",
      key: handle.dbkey,
      all: 1,
    });

    const removes = [handle.dbkey];

    blocks.forEach((item) => {
      removes.push(item.key);
    });

    setTimeout(() => {
      clearCache(blocks.map((item) => item.fileHash));
    });

    return await setData({
      removes,
    });
  };

  const removeDir = async ({ handle, options }) => {
    const defaults = {
      recursive: false,
      ...options,
    };

    const blocks = await getData({
      keyName: "parent",
      key: handle.dbkey,
      all: 1,
    });

    const removes = [handle.dbkey];

    if (!blocks.length) {
      return await setData({
        removes,
      });
    }

    if (blocks.length && !defaults.recursive) {
      throw new Error(
        `The directory contains additional content, please add the recursive option`
      );
    }

    let count = 0;
    const total = blocks.length;

    for await (let item of handle.values()) {
      options.process &&
        options.process({ total, count, deleted: false, item, path: item.path });
      await item.remove({
        recursive: true,
        process: ({ path, deleted }) => {
          options.process &&
            options.process({
              total,
              count,
              item,
              deleted,
              path,
            });
        },
      });
      count++;
      options.process &&
        options.process({ total, count, deleted: true, item, path: item.path });
    }

    return await setData({
      removes,
    });
  };

  const makesureDBkey = (_this) => {
    if (!_this.dbkey) {
      throw new Error(`This ${_this.kind} has been deleted`);
    }
  };

  class BaseHandle {
    #kind = "";
    #relates = [];
    #root = null;
    #dbkey = null;
    constructor({ kind, paths, root, dbkey }) {
      this.#kind = kind;
      this.#relates = paths || [];
      this.#root = root || null;
      this.#dbkey = dbkey;
    }

    get kind() {
      return this.#kind;
    }

    get name() {
      return this.#relates.slice(-1)[0];
    }

    get root() {
      return this.#root || this;
    }

    get path() {
      return this.#relates.join("/");
    }

    get paths() {
      return this.#relates.slice();
    }

    get dbkey() {
      return this.#dbkey;
    }

    async parent() {
      if (this.dbkey === "root") {
        return null;
      }

      const parentData = await getData({
        key: this.dbkey,
      });

      const paths = this.paths.slice(0, -1);

      return new DirHandle({
        paths,
        root: paths.length === 1 ? null : this.root,
        dbkey: parentData.parent,
      });
    }

    async remove(options) {
      if (this.kind === DIR) {
        await removeDir({ handle: this, options });
      } else {
        await removeFile({ handle: this });
      }

      this.#dbkey = null;
    }

    async move(...args) {
      if (args.length === 1) {
        // 重命名
        const newName = args[0];

        const data = await getData({
          key: this.dbkey,
        });

        // 确认没有重复
        const existed = await find(
          {
            keyName: "parent",
            key: "root",
          },
          (item) => item.name === newName
        );

        if (existed) {
          throw new Error(`'${newName}' already exists`);
        }

        data.name = newName;

        await setData({
          datas: [data],
        });

        return null;
      }
    }

    async stat() {
      const data = await getData({ key: this.dbkey });

      return [{}, "createTime", "type", "lastModified"].reduce((obj, name) => {
        data[name] && (obj[name] = data[name]);
        return obj;
      });
    }
  }

  const createHandle = (parentHandle, handleData) => {
    let TargetHandle;
    switch (handleData.type) {
      case DIR:
        TargetHandle = DirHandle;
        break;
      case "file":
        TargetHandle = FileHandle;
        break;
    }

    return new TargetHandle({
      paths: [...parentHandle.paths, handleData.name],
      root: parentHandle.root,
      dbkey: handleData.key,
    });
  };

  const writingDB = {};

  class DirHandle extends BaseHandle {
    constructor(options) {
      super({ ...options, kind: DIR });
    }

    async get(name, options) {
      makesureDBkey(this);

      const defaults = {
        create: null, // DIR or "file"
        ...options,
      };

      const names = name.split("/");
      const namesLen = names.length;

      if (namesLen === 1) {
        // 已存在就直接返回存在的
        let result = await find(
          {
            key: this.dbkey,
            keyName: "parent",
          },
          (item) => item.name === name
        );

        if (!result) {
          if (!defaults.create) {
            return null;
          }

          // When writing files to an uncreated folder at the same time, it will cause the same folder to be created repeatedly.
          // At this time, the folder is only created for the first time, and the subsequent wait is completed before writing the file.
          let _res;
          if (!writingDB[`${this.dbkey}-${name}`]) {
            writingDB[`${this.dbkey}-${name}`] = new Promise(
              (resolve) => (_res = resolve)
            );

            await setData({
              datas: [
                (result = {
                  key: getRandomId(),
                  parent: this.dbkey,
                  name,
                  type: defaults.create === DIR ? DIR : "file",
                  createTime: Date.now(),
                }),
              ],
            });

            _res(result);

            delete writingDB[`${this.dbkey}-${name}`];
          } else {
            result = await writingDB[`${this.dbkey}-${name}`];
          }
        }

        return createHandle(this, result);
      }

      let target = this;
      for (let item, i = 0; i < namesLen - 1; i++) {
        item = names[i];
        target = await target.get(item, {
          create: defaults.create && DIR,
        });

        if (!target) {
          throw new Error(`"${names.slice(0, i + 1).join("/")}" does not exist`);
        }
      }

      return await target.get(names.slice(-1)[0], defaults);
    }

    async *entries() {
      makesureDBkey(this);

      const datas = await getData({
        key: this.dbkey,
        keyName: "parent",
        all: true,
      });

      for (let item of datas) {
        yield [item.name, createHandle(this, item)];
      }
    }

    async *keys() {
      for await (let [name] of this.entries()) {
        yield name;
      }
    }

    async *values() {
      for await (let [, handle] of this.entries()) {
        yield handle;
      }
    }

    async removeEntry(name, options) {
      makesureDBkey(this);

      const target = await this.get(name);

      if (target) {
        return target.remove(options);
      }
    }
  }

  class FileHandle extends BaseHandle {
    constructor(options) {
      super({ ...options, kind: "file" });
    }

    async write(content, process) {
      makesureDBkey(this);

      await writeContent({
        content,
        process,
        handle: this,
      });

      const data = await getData({
        key: this.dbkey,
      });

      data.lastModified = content.lastModified || Date.now();
      if (content instanceof File) {
        data.fileType = content.type;
      }

      await setData({
        datas: [data],
      });

      return true;
    }

    async read(options) {
      makesureDBkey(this);

      const defaults = {
        type: "file",
        ...options,
      };

      return await getContent({
        ...defaults,
        handle: this,
      });
    }

    file() {
      return this.read({ type: "file" });
    }

    text() {
      return this.read({ type: "text" });
    }

    buffer() {
      return this.read({ type: "buffer" });
    }
  }

  const rootHandle = new DirHandle({
    paths: [""],
    kind: "directory",
    dbkey: "root",
  });

  const get = (path, options) => {
    if (!path) {
      return rootHandle;
    }

    return rootHandle.get(path, options);
  };

  const fsId = Math.random().toString(32).slice(2);
  const filerootChannel = new BroadcastChannel("noneos-fs-channel");

  const remotes = [];

  // globalThis.remotes = remotes;

  console.log("fsId", fsId);

  const registerMaps = {};

  filerootChannel.addEventListener("message", async (event) => {
    const { data } = event;

    // console.log(data);
    if (registerMaps[data.type]) {
      const result = await registerMaps[data.type]({ ...data });

      if (result !== undefined) {
        filerootChannel.postMessage({
          result,
          taskId: data.taskId,
        });
      }
    }
  });

  if (typeof document !== "undefined") {
    if (document.querySelector("[data-fsid]")) {
      document.querySelector("[data-fsid]").innerHTML = fsId;
    }

    filerootChannel.addEventListener("message", (event) => {
      if (document.querySelector("[data-remotes]")) {
        document.querySelector("[data-remotes]").innerHTML = JSON.stringify(
          remotes.map((e) => e.fsId)
        );
      }
    });
  }

  self.addEventListener("fetch", async (event) => {
    const { request } = event;
    const { url } = request;
    const urlObj = new URL(url);
    const { pathname } = urlObj;

    if (
      pathname === "/" ||
      pathname === "/index.html" ||
      pathname === "/main-init.js"
    ) {
      event.respondWith(
        fetch(pathname).catch(async () => {
          const cache = await caches.open("noneos-bootstrap");

          return cache.match(pathname);
        })
      );
    } else if (/^\/\$/.test(pathname)) {
      // 属于$的进入虚拟空间获取数据
      event.respondWith(
        (async () => {
          const pathArr = pathname.split("/");

          try {
            let handle;

            if (pathArr[1].length > 1) {
              // 虚拟本地目录
              let rootname = pathArr[1].replace(/^\$/, "");
              rootname = decodeURIComponent(rootname);

              let targetHandle;
              remotes.some((e) => {
                e.others.some((item) => {
                  if (item.name === rootname) {
                    targetHandle = item;
                  }
                });
              });

              if (targetHandle) {
                handle = await targetHandle.get(
                  decodeURIComponent(pathArr.slice(2).join("/"))
                );
              }
            } else {
              handle = await get(decodeURIComponent(pathArr.slice(2).join("/")));
            }

            const file = await handle.file();

            const headers = {};

            const { pathname } = new URL(request.url);

            [
              ["js", "application/javascript;charset=utf-8"],
              ["json", "application/json;charset=utf-8"],
              ["svg", "image/svg+xml"],
            ].some(([str, ct]) => {
              const reg = new RegExp(`\.${str}$`);
              if (reg.test(pathname)) {
                headers["Content-Type"] = ct;
                return true;
              }
            });

            return new Response(file, {
              status: 200,
              headers,
            });
          } catch (err) {
            console.error(err);
            return new Response(undefined, {
              status: 404,
            });
          }
        })()
      );
    }
  });

  self.addEventListener("install", () => {
    self.skipWaiting();

    console.log("NoneOS installation successful");
  });

  self.addEventListener("activate", () => {
    console.log("NoneOS server activation successful");
  });

})();
