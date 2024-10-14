(function (user_js) {
  'use strict';

  const cn = {
    pathEmpty: "文件路径不能为空",
    indexErr: "在数据库{dbname}的{storename}表中没有找到索引{key}",
    setDataErr: "设置数据出错",
    findDataErr: "查找数据出错",
    getDataErr: "获取数据出错",
    rootEmpty: "不允许使用 '/' 开头的路径",
    rootNotExist: "根目录 {rootname} 不存在",
    pathNotFound: "未找到文件夹:{path}",
    storeNotExistMethod: "store中不存在方法 {method}",
    invalidCreateType: "create必须等于'file'或'dir'",
    notDeleteRoot: "不能直接删除根节点{name}",
    deleted: "当前handle已被删除，不能使用{name}；旧地址为:{path}",
    exitedName: "操作失败，{name}已经存在",
    tolowcase: "文件系统对大小写不敏感，{oldName}将会被转为{newName}",
    writefile: "写入文件内容失败:{path}",
    noPicker: "当前浏览器不支持文件选择",
    targetAnotherType:
      "{path} 已经是一个'{exitedType}'，不能创建为'{targetType}'",
    notMoveToChild: "{targetPath} 是 {path} 的子目录，不能移动到自己的子目录",
    notFoundChunk: "{path}文件没有找到对应的块文件:{hash}",
  };

  /**
   * 根据键、选项和错误对象生成错误对象。
   *
   * @param {string} key - 错误描述的键。
   * @param {Object} [options] - 映射相关值的选项对象。
   * @param {Error} [error] - 原始错误对象。
   * @returns {Error} 生成的错误对象。
   */
  const getErr = (key, options, error) => {
    let desc = cn[key];

    // 映射相关值
    if (options) {
      for (let k in options) {
        desc = desc.replace(new RegExp(`{${k}}`, "g"), options[k]);
      }
    }

    let errObj;
    if (error) {
      errObj = new Error(desc, { cause: error });
    } else {
      errObj = new Error(desc);
    }
    errObj.code = key;

    return errObj;
  };

  const allDB = {};
  // export const getRandomId = () => Math.random().toString(36).slice(2);
  function getRandomId(length = 10) {
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
  const getDB = async (dbName = "noneos_fs_defaults") => {
    if (!allDB[dbName]) {
      allDB[dbName] = new Promise((resolve) => {
        // 根据id获取数据库
        const req = indexedDB.open(dbName);

        req.onsuccess = async (e) => {
          const db = e.target.result;

          db.onclose = () => {
            allDB[dbName] = null;
          };

          resolve(db);

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
          throw new Event(dbName + " creation error", {
            cause: event.error,
          });
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
  const getData = async ({
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
  const setData = async ({
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

        resolve(true);
      };
      transaction.onerror = (e) => {
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

  /**
   * 判断旧hash是否还被引用，清除不被引用的块
   * @param {array} oldHashs 旧的文件块数据
   */
  const clearHashs = async (oldHashs) => {
    // 查找并删除多余的块
    const needRemoves = [];
    await Promise.all(
      oldHashs.map(async (key) => {
        const exited = await getData({
          index: "hash",
          key,
        });

        !exited && needRemoves.push(key);
      })
    );

    if (needRemoves.length) {
      await setData({
        storename: "blocks",
        removes: needRemoves,
      });
    }
  };

  /**
   * 获取自身在db上的数据，带有判断自身是否被删除的逻辑
   * @param {(DirHandle|FileHandle)} handle
   * @param {string} errName 当判断到当前handle已经被删除，报错的时的name
   * @returns {Object}
   */
  const getSelfData = async (handle, errName) => {
    const data = await getData({ key: handle.id });

    if (!data) {
      throw getErr(
        "deleted",
        {
          name: errName,
          path: handle.path,
        },
        handle
      );
    }

    return data;
  };

  /**
   * 更新所有父层的修改时间
   * @param {string} id 目标handle的id
   */
  const updateParentsModified = async (id) => {
    const parents = [];
    const time = Date.now();

    let key = id;

    while (key) {
      const targeData = await getData({ key });
      if (!targeData) {
        break;
      }

      targeData.lastModified = time;
      parents.push(targeData);
      key = targeData.parent;
    }

    await setData({
      datas: parents,
    });
  };

  /**
   * 物理拷贝文件/文件夹的方法，兼容所有类型的handle
   * 复制目标到另一个目标
   * @param {handle} source 源文件/目录
   * @param {handle} target 目标文件/目录
   * @param {string} name 复制过去后的命名
   * @param {function} callback 复制过程中的callback
   */
  const copyTo = async ({ source, target, name, callback }) => {
    [target, name] = await fixTargetAndName({ target, name, self: source });

    if (source.kind === "file") {
      const selfFile = await source.file();
      const newFile = await target.get(name, { create: "file" });
      await newFile.write(selfFile, callback);

      return newFile;
    } else if (source.kind === "dir") {
      const newDir = await target.get(name, {
        create: "dir",
      });

      await source.forEach(async (handle) => {
        await copyTo({
          source: handle,
          target: newDir,
          name: handle.name,
          callback,
        });
      });

      return newDir;
    }
  };

  // 修正 target 和 name 的值
  const fixTargetAndName = async ({ target, name, self }) => {
    if (typeof target === "string") {
      name = target;
      target = await self.parent();
    }

    if (!name) {
      name = self.name;
    }

    // 查看是否已经有同名的文件或文件夹
    let exited = false;
    for await (let subName of target.keys()) {
      if (name === subName) {
        exited = 1;
        break;
      }
    }

    if (exited) {
      throw getErr("exitedName", {
        name: `${name}(${target.path}/${name})`,
      });
    }

    if (isSubdirectory(target.path, self.path)) {
      throw getErr("notMoveToChild", {
        targetPath: target.path,
        path: self.path,
      });
    }

    return [target, name];
  };

  function isSubdirectory(child, parent) {
    if (child === parent) {
      return false;
    }
    const parentTokens = parent.split("/").filter((i) => i.length);
    const childTokens = child.split("/").filter((i) => i.length);
    return parentTokens.every((t, i) => childTokens[i] === t);
  }

  // 获取目标文件或文件夹的任务树状信息
  const flatHandle = async (handle) => {
    if (handle.kind === "file") {
      return [await getFileData(handle)];
    }

    const arr = [];

    for await (let subHandle of handle.values()) {
      if (subHandle.kind === "dir") {
        const subs = await flatHandle(subHandle);
        arr.push(...subs);
      } else {
        arr.push(await getFileData(subHandle));
      }
    }

    return arr;
  };

  const getFileData = async (handle) => {
    const data = {
      size: await handle.size(),
      path: handle.path,
    };

    Object.defineProperty(data, "handle", {
      get() {
        return handle;
      },
    });

    return data;
  };

  const CHUNK_REMOTE_SIZE = 128 * 1024; // 64kb // 远程复制的块大小

  const CHUNK_SIZE = 1024 * 1024; // 1mb // db数据库文件块的大小
  // const CHUNK_SIZE = 512 * 1024; // 512KB
  // const CHUNK_SIZE = 1024 * 4; // 4kb

  /**
   * 将输入的内容分割成多段，以1mb为一个块
   * @param {(string|file|arrayBuffer)} input 写入的内容
   * @returns {array} 分割后的内容
   */
  const splitIntoChunks = async (input, csize = CHUNK_SIZE) => {
    let arrayBuffer;

    if (typeof input === "string") {
      arrayBuffer = new TextEncoder().encode(input).buffer;
    } else if (input instanceof File) {
      arrayBuffer = await input.arrayBuffer();
    } else if (input instanceof ArrayBuffer) {
      arrayBuffer = input;
    } else if (input instanceof Uint8Array) {
      arrayBuffer = input.buffer;
    } else {
      throw new Error(
        "Input must be a string, File object or ArrayBuffer object"
      );
    }

    const chunks = [];
    for (let i = 0; i < arrayBuffer.byteLength; i += csize) {
      const chunk = arrayBuffer.slice(i, i + csize);
      chunks.push(chunk);
    }

    return chunks;
  };

  /**
   * 将分割的块还原回原来的数据
   * @param {ArrayBuffer[]} chunks 分割的块
   * @returns {ArrayBuffer} 还原后的数据
   */
  const mergeChunks = (chunks) => {
    // 计算总长度
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);

    const mergedArrayBuffer = new Uint8Array(totalLength);

    let offset = 0;
    chunks.forEach((chunk) => {
      mergedArrayBuffer.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    });

    return mergedArrayBuffer;
  };

  /**
   * 获取文件的哈希值
   * @param {arrayBuffer} arrayBuffer 文件的内容
   * @returns {string} 文件的哈希值
   */
  const calculateHash = async (arrayBuffer) => {
    if (typeof arrayBuffer == "string") {
      const encoder = new TextEncoder();
      arrayBuffer = encoder.encode(arrayBuffer);
    }

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

  const readBufferByType = ({ buffer, type, data, isChunk }) => {
    // 根据type返回不同类型的数据
    if (type === "text") {
      return new TextDecoder().decode(buffer);
    } else if (type === "file") {
      if (isChunk) {
        return new Blob([buffer.buffer]);
      }
      return new File([buffer.buffer], data.name, {
        lastModified: data.lastModified,
      });
    } else if (type === "base64") {
      return new Promise((resolve) => {
        const file = new File([buffer.buffer], data.name);
        const reader = new FileReader();
        reader.onload = () => {
          resolve(reader.result);
        };
        reader.readAsDataURL(file);
      });
    } else {
      return buffer.buffer;
    }
  };

  const SName = Symbol("storage-name");
  const IDB = Symbol("idb");

  class EverCache {
    constructor(id = "public") {
      // this[SName] = id;
      this[SName] = "main";

      this[IDB] = new Promise((resolve) => {
        let req = indexedDB.open(`ever-cache-${id}`);

        req.onsuccess = (e) => {
          resolve(e.target.result);
        };

        req.onupgradeneeded = (e) => {
          // e.target.result.createObjectStore(id, { keyPath: "key" });
          e.target.result.createObjectStore("main", { keyPath: "key" });
        };
      });

      return new Proxy(this, handle);
    }

    async setItem(key, value) {
      return commonTask(this, (store) => store.put({ key, value })).then(
        () => true
      );
    }

    async getItem(key) {
      try {
        return commonTask(this, (store) => store.get(key), "readonly").then(
          (e) => {
            const { result } = e.target;
            return result ? result.value : null;
          }
        );
      } catch (err) {
        debugger;
      }
    }

    async removeItem(key) {
      return commonTask(this, (store) => store.delete(key)).then(() => true);
    }

    async clear() {
      return commonTask(this, (store) => store.clear()).then(() => true);
    }

    async key(index) {
      return commonTask(this, (store) => store.getAllKeys()).then(
        (e) => e.target.result[index]
      );
    }

    get length() {
      return commonTask(this, (store) => store.count()).then(
        (e) => e.target.result
      );
    }

    entries() {
      return {
        [Symbol.asyncIterator]: () => {
          let resolve;
          let cursorPms;
          const resetPms = () => {
            cursorPms = new Promise((res) => (resolve = res));
          };
          resetPms();

          commonTask(
            this,
            (store) => store.openCursor(),
            "readonly",
            (e) => resolve(e.target.result)
          );

          return {
            async next() {
              const cursor = await cursorPms;
              if (!cursor) {
                return {
                  done: true,
                };
              }
              resetPms();
              const { key, value } = cursor.value;
              cursor.continue();

              return { value: [key, value], done: false };
            },
          };
        },
      };
    }

    async *keys() {
      for await (let [key, value] of this.entries()) {
        yield key;
      }
    }

    async *values() {
      for await (let [key, value] of this.entries()) {
        yield value;
      }
    }
  }

  const exitedKeys = new Set(Object.getOwnPropertyNames(EverCache.prototype));

  const handle = {
    get(target, key, receiver) {
      if (exitedKeys.has(key) || typeof key === "symbol") {
        return Reflect.get(target, key, receiver);
      }

      return target.getItem(key);
    },
    set(target, key, value) {
      return target.setItem(key, value);
    },
    deleteProperty(target, key) {
      return target.removeItem(key);
    },
  };

  const commonTask = async (_this, afterStore, mode = "readwrite", succeed) => {
    const db = await _this[IDB];

    return new Promise((resolve, reject) => {
      const req = afterStore(
        db.transaction([_this[SName]], mode).objectStore(_this[SName])
      );

      req.onsuccess = (e) => {
        if (succeed) {
          const result = succeed(e);
          if (result) {
            resolve(result);
          }

          return;
        }

        resolve(e);
      };
      req.onerror = (e) => {
        reject(e);
      };
    });
  };

  new EverCache();

  const storage = new EverCache("remote-file-cache");

  // 重新获取块
  const getCache = async (key) => {
    const result = await storage.getItem(key);

    if (result) {
      // 重置时间
      storage.setItem(`${key}-time`, Date.now());
    }

    return result;
  };

  const hands = {};
  const resolver = {};

  // 缓存块
  const saveCache = (key, chunk) => {
    storage.setItem(key, chunk);
    storage.setItem(`${key}-time`, Date.now());

    if (hands[key]) {
      // 返回握手数据
      resolver[key](chunk);
      delete hands[key];
      delete resolver[key];
    }
  };

  // 获取握手器，当save对应hash时，及时返回数据
  const handCache = async (hash) => {
    const result = await getCache(hash);

    if (result) {
      return result;
    }

    const pms =
      hands[hash] ||
      (hands[hash] = new Promise((resolve) => {
        resolver[hash] = resolve;
      }));

    return pms;
  };

  // 清除超时缓存
  const clearCache = async () => {
    const now = Date.now();
    for await (let [key, value] of storage.entries()) {
      if (/-time$/.test(key)) {
        if (now - value > 5 * 60 * 1000) {
          // 清除超过5分钟的内容
          const realKey = key.replace("-time", "");
          storage.removeItem(realKey);
          storage.removeItem(key);
        }
      }
    }

    // 定时清除缓存
    setTimeout(clearCache, 1 * 60 * 1000);
  };

  clearCache();

  // 根据key获取值
  // 先在本地获取，本地获取不到的情况下，从远端获取
  const fetchCache = async (key, userid) => {
    const result = await getCache(key);

    if (result) {
      return result;
    }

    return new Promise((resolve) => {
      let timer;
      let f = () => {
        let targetUsr;

        if (userid) {
          targetUsr = user_js.users.find((e) => e.id === userid);
        } else {
          // 向所有用户广播查找
          debugger;
        }

        if (!targetUsr) {
          alert("查找不到用户");
          return;
        }

        // 重新发送缓存请求
        targetUsr._send({
          type: "getCache",
          hashs: [key],
        });

        timer = setTimeout(() => {
          // 4秒内还没搞定，重新发起请求
          f();
        }, 4000);
      };

      handCache(key).then((data) => {
        clearTimeout(timer);
        f = null;
        resolve(data);
      });

      f();
    });
  };

  class PublicBaseHandle {
    constructor() {}

    // 扁平化文件数据
    async flat() {
      return flatHandle(this);
    }

    // 按照需求将文件保存到缓存池中，方便远端获取
    async _saveCache(arg) {
      const chunkSize = arg.size;
      const { options, returnHashs } = arg;

      // 获取指定的块内容
      const result = await this.buffer(options);
      const datas = await splitIntoChunks(result, chunkSize);

      const hashs = [];

      await Promise.all(
        datas.map(async (chunk, i) => {
          const hash = await calculateHash(chunk);

          hashs[i] = hash;

          await saveCache(hash, chunk);
        })
      );

      if (returnHashs) {
        return hashs;
      }

      return true;
    }

    // 从缓冲池进行组装文件并写入
    async _writeByCache(options) {
      const { hashs } = options;

      const userId = this.path.replace(/^\$remote:(.+):.+\/.+/, "$1");

      const chunks = await Promise.all(
        hashs.map(async (hash) => {
          return fetchCache(hash, userId);
        })
      );

      // 写入文件
      const writer = await this.createWritable();

      for (let chunk of chunks) {
        await writer.write(chunk);
      }

      writer.close();

      return true;
    }

    async _getHashs(options) {
      options = options || {};
      const chunkSize = options.size || CHUNK_REMOTE_SIZE;

      // 获取指定的块内容
      const result = await this.buffer();

      const datas = await splitIntoChunks(result, chunkSize);

      const hashs = await Promise.all(
        datas.map(async (chunk) => {
          return await calculateHash(chunk);
        })
      );

      return hashs;
    }

    // 根据哈希值，从缓存目录获取块数据，再合并成一个完整的文件
    async _mergeChunk(hashs, cacheDirPath) {
      const cacheDir = await (await this.root()).get(cacheDirPath);

      if (!cacheDir) {
        throw new Error("没有找到缓冲目录");
      }

      const writer = await this.createWritable();

      for (let hash of hashs) {
        const handle = await cacheDir.get(hash);
        if (!handle) {
          const err = get("notFoundChunk", {
            path: item.path,
            hash,
          });
          console.error(err);
          await writer.abort();
          throw err;
        }

        const data = await handle.buffer();
        await writer.write(data);
      }

      // 没有报错
      await writer.close();

      return true;
    }
  }

  /**
   * 基础的Handle
   */
  class BaseHandle extends PublicBaseHandle {
    #id;
    #kind;
    #path;
    #name;
    #createTime;
    #lastModified;
    constructor(id, kind) {
      super();
      this.#id = id;
      this.#kind = kind;
    }

    /**
     * 获取当前handle在db中的id
     * @returns {string}
     */
    get id() {
      return this.#id;
    }

    /**
     * 获取当前handle的路径
     * @returns {string}
     */
    get path() {
      return this.#path;
    }

    /**
     * 获取文件名
     * @returns {string}
     */
    get name() {
      return this.#name;
    }

    /**
     * 获取当前handle的类型
     * @returns {string}
     */
    get kind() {
      return this.#kind;
    }

    get createTime() {
      return this.#createTime;
    }

    get lastModified() {
      return this.#lastModified || null;
    }

    /**
     * 获取根文件夹的handle
     * @returns {Promise<DirHandle>}
     */
    async root() {
      let data = await getSelfData(this, "root");

      while (data.parent !== "root") {
        data = await getData({ key: data.parent });
      }

      const handle = await new DirHandle(data.key);

      await handle.refresh();

      return handle;
    }

    /**
     * 获取父文件夹handle
     * @returns {Promise<DirHandle>}
     */
    async parent() {
      const data = await getSelfData(this, "parent");

      if (data.parent === "root") {
        return null;
      }

      const parentHandle = new DirHandle(data.parent);
      await parentHandle.refresh();

      return parentHandle;
    }

    /**
     * 移动当前文件或文件夹
     * 若 target 为字符串，则表示重命名
     * @param {(string|DirHandle)} target 移动到目标的文件夹
     * @param {string} name 移动到目标文件夹下的名称
     */
    async moveTo(target, name) {
      [target, name] = await fixTargetAndName({ target, name, self: this });

      const selfData = await getSelfData(this, "move");
      selfData.parent = target.id;
      selfData.name = name.toLowerCase();
      selfData.realName = name;

      await setData({
        datas: [selfData],
      });

      await this.refresh();
    }

    /**
     * 复制当前文件或文件夹
     * @param {(string|DirHandle)} target 移动到目标的文件夹
     * @param {string} name 移动到目标文件夹下的名称
     */
    async copyTo(target, name, callback) {
      [target, name] = await fixTargetAndName({ target, name, self: this });

      if (!(target instanceof BaseHandle)) {
        return copyTo({ source: this, target, name, callback });
      }

      let reHandle;

      switch (this.kind) {
        case "dir":
          reHandle = await target.get(name, {
            create: "dir",
          });

          for await (let [name, subHandle] of this.entries()) {
            await subHandle.copyTo(reHandle, name);
          }
          break;
        case "file":
          reHandle = await target.get(name, {
            create: "file",
          });

          // 直接存储hashs数据更高效
          const selfData = await getSelfData(this, "move");
          const targetData = await getData({ key: reHandle.id });

          const hashs = (targetData.hashs = selfData.hashs);

          await setData({
            datas: [
              { ...selfData, ...targetData },
              ...hashs.map((hash, index) => {
                return {
                  key: `${targetData.key}-${index}`,
                  hash,
                  type: "block",
                };
              }),
            ],
          });

          break;
      }

      await updateParentsModified(target.id);

      return reHandle;
    }

    /**
     * 删除当前文件或文件夹
     * @returns {Promise<void>}
     */
    async remove(callback) {
      const data = await getSelfData(this, "remove");

      if (data.parent === "root") {
        // root下属于挂载的目录，不允许直接删除
        throw getErr("notDeleteRoot", {
          name: this.name,
        });
      }

      if (this.kind === "dir") {
        // 删除子文件和文件夹
        await this.forEach(async (handle) => {
          await handle.remove(callback);
        });
      }

      const oldHashs = data.hashs || [];

      const removes = [data.key];
      oldHashs.forEach((e, index) => {
        removes.push(`${data.key}-${index}`);
      });

      await setData({
        removes,
      });

      if (oldHashs.length) {
        await clearHashs(oldHashs);
      }

      if (callback) {
        callback({
          type: "remove",
          path: this.path,
        });
      }
    }

    /**
     * 刷新当前文件或文件夹的信息（主要更新 path 和 name 的信息）
     * 当 handle 被 move方法执行成功后，需要及时更新信息
     */
    async refresh() {
      const data = await getSelfData(this, "refresh");

      this.#createTime = data.createTime;
      this.#lastModified = data.lastModified;

      this.#name = data.realName || data.name;

      // 重新从db中获取parent数据并更新path
      const pathArr = [data.realName || data.name];

      let currentData = data;
      while (currentData.parent !== "root") {
        currentData = await getData({ key: currentData.parent });
        pathArr.unshift(currentData.realName || currentData.name);
      }

      this.#path = pathArr.join("/");
    }

    async size() {
      const data = await getSelfData(this, "size");

      if (data.type === "file") {
        return data.size;
      }
    }

    toJSON() {
      const data = {};
      ["createTime", "id", "kind", "lastModified", "name", "path"].forEach(
        (key) => {
          data[key] = this[key];
        }
      );
      return data;
    }

    get _mark() {
      return "db";
    }
  }

  /**
   * 创建文件handle
   * @extends {BaseHandle}
   */
  class FileHandle extends BaseHandle {
    /**
     * 创建一个文件句柄实例
     * @param {string} id - 文件句柄的唯一标识符
     */
    constructor(id) {
      super(id, "file");
    }

    /**
     * 写入文件数据
     * @returns {Promise<void>}
     */
    async write(data, callback) {
      const writer = await this.createWritable();

      const size = data.length || data.size || data.byteLength || 0;

      const length = Math.ceil(size / CHUNK_SIZE);

      writer.onbeforewrite = (e) => {
        callback &&
          callback({
            ...e,
            length,
            type: "write-file-start",
          });
      };

      writer.onwrite = (e) => {
        callback &&
          callback({
            ...e,
            length,
            type: "write-file-end",
          });
      };

      await writer.write(data);
      await writer.close();
    }

    // 写入数据流
    async createWritable() {
      return new DBFSWritableFileStream(this.id, this.path);
    }

    /**
     * 返回文件数据
     * @param {string} type 读取数据后返回的类型
     * @param {object} options 读取数据的选项
     * @returns {Promise<(File|String|Buffer)>}
     */
    async read(type, options) {
      // options = {
      //   start: 0,
      //   end,
      // };

      const data = await getSelfData(this, "读取数据");

      // 重新组合文件
      const { hashs } = data;

      let chunks = [];
      if (options && (options.start || options.end)) {
        // 获取指定范围内的数据
        let startBlockId = Math.floor(options.start / CHUNK_SIZE);
        let endBlockId = Math.floor(options.end / CHUNK_SIZE);

        chunks = await Promise.all(
          hashs.map(async (hash, index) => {
            let chunk;

            if (index >= startBlockId && index <= endBlockId) {
              const data = await getData({
                storename: "blocks",
                key: hash,
              });

              chunk = data.chunk;

              if (startBlockId === endBlockId) {
                chunk = chunk.slice(
                  options.start - index * CHUNK_SIZE,
                  options.end - index * CHUNK_SIZE
                );
              } else if (index === startBlockId) {
                chunk = chunk.slice(
                  -1 * ((startBlockId + 1) * CHUNK_SIZE - options.start)
                );
              } else if (index === endBlockId) {
                chunk = chunk.slice(0, options.end - endBlockId * CHUNK_SIZE);
              }
            }

            return chunk;
          })
        );
        chunks = chunks.filter((e) => !!e);
      } else {
        if (hashs) {
          chunks = await Promise.all(
            hashs.map(async (hash, index) => {
              const { chunk } = await getData({
                storename: "blocks",
                key: hash,
              });

              return chunk;
            })
          );
        }
      }

      const buffer = mergeChunks(chunks);

      return readBufferByType({
        buffer,
        type,
        data,
        isChunk: options?.start || options?.end,
      });
    }

    /**
     * 返回文件数据
     * @param {object} options 读取数据的选项
     * @returns {Promise<File>}
     */
    file(options) {
      return this.read("file", options);
    }

    /**
     * 返回文件数据
     * @param {object} options 读取数据的选项
     * @returns {Promise<Text>}
     */
    text(options) {
      return this.read("text", options);
    }

    /**
     * 返回文件数据
     * @param {object} options 读取数据的选项
     * @returns {Promise<Buffer>}
     */
    buffer(options) {
      return this.read("buffer", options);
    }

    base64(options) {
      return this.read("base64", options);
    }
  }

  // 虚拟文件系统的文件流
  class DBFSWritableFileStream {
    #fileID; // 目标文件id
    #cache = new ArrayBuffer(); // 给内存缓冲区用的变量，1mb大小
    #hashs = []; // 写入块的哈希值
    #size = 0;
    #path;
    constructor(id, path) {
      this.#fileID = id;
      this.#path = path;
    }

    // 写入流数据
    async write(input) {
      let arrayBuffer;

      if (typeof input === "string") {
        arrayBuffer = new TextEncoder().encode(input).buffer;
      } else if (input instanceof File) {
        arrayBuffer = await input.arrayBuffer();
      } else if (input instanceof ArrayBuffer) {
        arrayBuffer = input;
      }

      this.#size += arrayBuffer.byteLength;

      // 写入缓存区
      this.#cache = mergeArrayBuffers(this.#cache, arrayBuffer);

      // 根据缓冲区写入到硬盘
      while (this.#cache.byteLength > CHUNK_SIZE) {
        // 取出前1mb的数据
        const targetChunk = this.#cache.slice(0, CHUNK_SIZE);
        this.#cache = this.#cache.slice(CHUNK_SIZE);

        const hash = await this._writeChunk(targetChunk);
        this.#hashs.push(hash);
      }
    }

    // 写入真正的内容
    async _writeChunk(chunk) {
      const hash = await calculateHash(chunk);

      // 查看是否有缓存
      const exited = await getData({
        storename: "blocks",
        key: hash,
      });

      const chunkData = {
        path: this.#path,
        index: this.#hashs.length, // 写入块的序列
        hash, // 写入块的哈希值
        exited, // 写入块是否已经存在
      };

      if (this.onbeforewrite) {
        this.onbeforewrite({
          type: "onbeforewrite",
          ...chunkData,
        });
      }
      // 写入到硬盘
      if (!exited) {
        await setData({
          storename: "blocks",
          datas: [
            {
              hash,
              chunk,
            },
          ],
        });
      }

      if (this.onwrite) {
        this.onwrite({
          type: "onwrite",
          ...chunkData,
        });
      }

      return hash;
    }

    // 确认写入到对应的位置
    async close() {
      const targetData = await getSelfData({ id: this.#fileID }, "write");

      if (!targetData) {
        // 文件不在就直接弃用
        await this.abort();
        return;
      }

      // 写入最后一缓存的内容
      if (this.#cache.byteLength > 0) {
        const hash = await this._writeChunk(this.#cache);
        this.#hashs.push(hash);
      }

      {
        // 写入对应路径的文件
        const oldHashs = targetData.hashs || [];
        const hashs = this.#hashs;
        const size = this.#size;

        // 如果old更长，清除多出来的块
        const needRemoveBlocks = [];
        for (let i = 0; i < oldHashs.length; i++) {
          if (i >= hashs.length) {
            needRemoveBlocks.push(`${this.#fileID}-${i}`);
          }
        }

        // 更新文件信息
        await setData({
          datas: [
            {
              ...targetData,
              lastModified: Date.now(),
              hashs,
              size,
            },
            ...hashs.map((hash, index) => {
              return {
                type: "block",
                key: `${this.#fileID}-${index}`,
                hash,
              };
            }),
          ],
          removes: needRemoveBlocks,
        });

        if (oldHashs.length) {
          await clearHashs(oldHashs);
        }

        await updateParentsModified(targetData.parent);
      }
    }

    // 放弃存储的内容
    async abort() {
      // 清除缓存
      if (this.#hashs) {
        await clearHashs(this.#hashs);
      }
    }
  }

  // 合并buffer数据的方法
  function mergeArrayBuffers(buffer1, buffer2) {
    // 计算新 ArrayBuffer 的总长度
    const totalLength = buffer1.byteLength + buffer2.byteLength;

    // 创建一个新的 ArrayBuffer
    const mergedBuffer = new ArrayBuffer(totalLength);

    // 创建一个 Uint8Array 以便操作新的 ArrayBuffer
    const uint8Array = new Uint8Array(mergedBuffer);

    // 复制第一个 ArrayBuffer 的数据
    uint8Array.set(new Uint8Array(buffer1), 0);

    // 复制第二个 ArrayBuffer 的数据
    uint8Array.set(new Uint8Array(buffer2), buffer1.byteLength);

    return mergedBuffer;
  }

  /**
   * 创建文件夹handle
   * @extends {BaseHandle}
   */
  class DirHandle extends BaseHandle {
    /**
     * 创建一个文件句柄实例
     * @param {string} id - 文件句柄的唯一标识符
     */
    constructor(id) {
      super(id, "dir");
    }

    /**
     * 获取子文件或目录的handle
     * @param {string} path - 获取的子文件或目录的路径
     * @param {Object} options - 获取选项的选项
     * @returns  {Promise<(FileHandle|DirHandle)>}
     */
    async get(path, options) {
      await getSelfData(this, "get");

      const paths = path.split("/");

      if (
        options &&
        options.create &&
        options.create !== "file" &&
        options.create !== "dir"
      ) {
        throw getErr("invalidCreateType");
      }

      let self = this;

      if (paths.length > 1) {
        // 如果路径中包含多个路径，则递归获取到最后一个路径的父目录
        // 如果带有 create 参数，则递归创建目录
        for (const memberName of paths.slice(0, -1)) {
          let prevDirHandle = self;
          self = await self.get(memberName, {
            create: options?.create ? "dir" : undefined,
          });
          if (!self) {
            await prevDirHandle.refresh();

            throw getErr("pathNotFound", {
              path: prevDirHandle.path + "/" + memberName,
            });
          }
        }
      }

      // 最后一级子文件或目录名
      let subName = paths.slice(-1)[0];

      let data = await getData({
        index: "parent_and_name",
        key: [self.id, subName.toLowerCase()],
      });

      if (options) {
        if (options.create && !data) {
          const nowTime = Date.now();

          // 当不存在数据，且create有值时，根据值进行创建
          data = {
            createTime: nowTime,
            lastModified: nowTime,
            key: getRandomId(),
            realName: subName,
            name: subName.toLowerCase(),
            parent: self.id,
            type: options.create,
          };

          await setData({
            datas: [data],
          });

          await updateParentsModified(self.id);
        }
      }

      if (options && options.create && options.create !== data.type) {
        // 如果带有 create 参数，且数据类型与 create 参数不一致，抛出错误
        throw getErr("targetAnotherType", {
          path: self.path + "/" + subName,
          exitedType: data.type,
          targetType: options.create,
        });
      }

      return await createHandle(data);
    }

    /**
     * 异步生成器函数，返回子数据的名称。
     * @async
     * @generator
     * @yields {string} 子数据的名称。
     */
    async *keys() {
      getSelfData(this, "keys");

      const datas = await getChildDatas(this.id);

      for (let item of datas) {
        yield item.name;
      }
    }

    /**
     * 异步生成器函数，返回子数据的名称和对应的句柄。
     * @async
     * @generator
     * @yields {Array} 包含子数据名称和句柄的数组。
     */
    async *entries() {
      getSelfData(this, "entries");

      const datas = await getChildDatas(this.id);

      for (let item of datas) {
        yield [item.name, await createHandle(item)];
      }
    }

    /**
     * 异步生成器函数，返回子数据的句柄。
     * @async
     * @generator
     * @yields {(DirHandle|FileHandle)} 子数据的句柄。
     */
    async *values() {
      getSelfData(this, "values");

      for await (let [, handle] of this.entries()) {
        yield handle;
      }
    }

    /**
     * 异步函数，对每个子数据执行回调函数。
     * @async
     * @param {Function} callback - 对每个子数据执行的回调函数，接收句柄和索引作为参数。
     */
    async forEach(callback) {
      getSelfData(this, "forEach");

      const datas = await getChildDatas(this.id);

      let index = 0;
      for (let item of datas) {
        await callback(await createHandle(item), index);
        index++;
      }
    }

    async length() {
      getSelfData(this, "length");

      const data = await getData({
        key: this.id,
        index: "parent",
        method: "count",
      });

      return data;
    }
  }

  const getChildDatas = async (id) => {
    return await getData({
      key: id,
      index: "parent",
      method: "getAll",
    });
  };

  const createHandle = async (data) => {
    let result = null;

    if (data) {
      switch (data.type) {
        case "dir":
          result = new DirHandle(data.key);
          break;
        case "file":
          result = new FileHandle(data.key);
          break;
      }

      await result.refresh();
    }

    return result;
  };

  // 创建root空间
  const createRoot = async (name) => {
    const targetRootData = await getData({
      index: "parent_and_name",
      key: ["root", name],
    });

    if (!targetRootData) {
      // 初始化Local目录
      await setData({
        datas: [
          {
            key: getRandomId(),
            parent: "root",
            name,
            createTime: Date.now(),
          },
        ],
      });
    }
  };

  // 初始化Local
  const inited = (async () => {
    await createRoot("local");
  })();

  /**
   * 获取传入字符串的handle对象
   * @param {String} path 文件或文件夹的路径
   * @returns {(DirHandle|FileHandle)}
   */
  const get$1 = async (path, options) => {
    const paths = path.split("/");

    if (!paths.length) {
      throw getErr("pathEmpty");
    }

    if (paths[0] === "") {
      throw getErr("rootEmpty");
    }

    await inited;

    const rootData = await getData({
      index: "parent_and_name",
      key: ["root", paths[0]],
    });

    if (!rootData) {
      throw getErr("rootNotExist", {
        rootname: paths[0],
      });
    }

    const rootHandle = new DirHandle(rootData.key);

    if (paths.length === 1) {
      await rootHandle.refresh();
      return rootHandle;
    }

    return rootHandle.get(paths.slice(1).join("/"), options);
  };

  const cacheResponse = async (path) => {
    const cache = await caches.open("noneos-default-cache");
    let resp = await cache.match(path);

    if (resp) {
      return resp.clone();
    }

    resp = await fetch(path);

    if (resp.status === 200) {
      cache.put(path, resp.clone());
    }

    return resp;
  };

  const getContentType = (prefix) => {
    switch (prefix) {
      case "html":
      case "htm":
      case "txt":
      case "md":
        return "text/plain; charset=utf-8";
      case "js":
      case "mjs":
        return "application/javascript; charset=utf-8";
      case "json":
        return "application/json; charset=utf-8";
      case "css":
        return "text/css; charset=utf-8";
      case "xml":
        return "application/xml; charset=utf-8";
      case "svg":
        return "image/svg+xml; charset=utf-8";
      case "csv":
        return "text/csv; charset=utf-8";
      case "ics":
        return "text/calendar; charset=utf-8";
      case "pdf":
        return "application/pdf; charset=utf-8";
      case "doc":
      case "docx":
        return "application/msword; charset=utf-8";
      case "xls":
      case "xlsx":
        return "application/vnd.ms-excel; charset=utf-8";
      case "ppt":
      case "pptx":
        return "application/vnd.ms-powerpoint; charset=utf-8";
      case "zip":
        return "application/zip; charset=utf-8";
      case "gz":
        return "application/gzip; charset=utf-8";
      case "tar":
        return "application/x-tar; charset=utf-8";
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "png":
        return "image/png";
      case "gif":
        return "image/gif";
      case "bmp":
        return "image/bmp";
      case "ico":
        return "image/x-icon";
      case "webp":
        return "image/webp";
      case "bmp":
        return "image/bmp";
      case "mp3":
        return "audio/mpeg";
      case "wav":
        return "audio/wav";
      case "mp4":
      case "m4v":
        return "video/mp4";
      case "mov":
        return "video/quicktime";
      case "avi":
        return "video/x-msvideo";
      default:
        return "application/octet-stream";
    }
  };

  const resposeFS = async ({ request }) => {
    const { pathname } = new URL(request.url);

    const path = decodeURIComponent(pathname.replace(/^\/\$\//, ""));

    // 判断是不是app入口
    const pathArr = path.split("/");

    if (
      pathArr.length === 3 &&
      (pathArr[0] === "apps" || pathArr[0] === "packages") &&
      (pathArr[2] === "app" || pathArr[2] === "appdebug")
    ) {
      return resposeApp({ pathname, path });
    }

    // console.log("path:", path);
    const handle = await get$1(path);
    let content = await handle.file();

    const headers = {};

    const prefix = path.split(".").pop();

    if (
      /^\/\$\/apps\//.test(pathname) &&
      prefix === "html" &&
      handle.name === "index.html"
    ) {
      // apps目录放权
      headers["Content-Type"] = "text/html; charset=utf-8";
    } else {
      headers["Content-Type"] = getContentType(prefix);
    }

    return new Response(content, {
      status: 200,
      headers,
    });
  };

  // 以app入口的形式返回内容
  const resposeApp = async ({ pathname, path }) => {
    let appconfig;

    // 获取父路径
    const pathArr = path.split("/");
    const parentPath = pathArr.slice(0, -1).join("/");

    const isdebug = pathArr.slice(-1)[0] === "appdebug";

    try {
      appconfig = await get$1(`${parentPath}/app.json`);
      appconfig = JSON.parse(await appconfig.text());
    } catch (err) {
      appconfig = await fetch(`/${parentPath}/app.json`).then((e) => e.json());
    }

    return new Response(
      `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />
    <title>${appconfig.name}</title>
    <link rel="shortcut icon" href="${appconfig.icon}">
    <link rel="apple-touch-icon" href="${appconfig.icon}" />
    <script src="/packages/ofa/ofa.js"${isdebug ? " debug" : ""}></script>
    <script src="/packages/ofa/router.min.js"></script>
    <script src="/packages/pui/init.js" type="module"></script>
    <style>
      html,
      body {
        margin: 0;
        padding: 0;
        height: 100%;
      }

      o-app {
        height: 100%;
      }
    </style>
  </head>
  <body>
    <o-router fix-body>
      <o-app src="${appconfig.config}"></o-app>
    </o-router>
    <o-root-provider name="pui" theme="dark"></o-root-provider>
    <o-root-provider name="clipboard" type="no"></o-root-provider>
  </body>
</html>
    `,
      {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      }
    );
  };

  /**
   * BUG: 😒 在 chrome 下，只更新这个文件的话，service worker 会一直处于 waiting 状态，导致更新不生效
   * 查明只会在chrome会出现这个问题，调试的时候请主动刷新 service woker
   */


  self.addEventListener("fetch", (event) => {
    const { request } = event;
    const { pathname, origin } = new URL(request.url);

    if (location.origin === origin) {
      if (pathname === "/" || pathname === "/index.html") {
        event.respondWith(cacheResponse(pathname));
      } else if (/^\/\$/.test(pathname)) {
        event.respondWith(
          (async () => {
            try {
              return await resposeFS({ request });
            } catch (err) {
              console.error(err);
              return new Response(err.stack || err.toString(), {
                status: 404,
              });
            }
          })()
        );
      } else if (/^\/packages\//.test(pathname)) {
        event.respondWith(
          (async () => {
            try {
              // 转发代理本地packages文件
              return await resposeFS({
                request: {
                  url: `${origin}/$${pathname}`,
                },
              });
            } catch (err) {
              // 本地请求失败，则请求线上
              return fetch(request.url);
            }
          })()
        );
      }
    }
  });

  self.addEventListener("install", () => {
    self.skipWaiting();
    console.log("NoneOS installation successful");
  });

  self.addEventListener("activate", () => {
    self.clients.claim();
    console.log("NoneOS server activation successful");
  });

})({});
