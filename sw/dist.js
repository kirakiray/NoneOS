(function () {
  'use strict';

  class PublicBaseHandle {
    #parent;
    #root;
    constructor(options) {
      this.#parent = options.parent;
      this.#root = options.root;
    }

    get parent() {
      return this.#parent;
    }

    get root() {
      return this.#root || this;
    }

    get path() {
      if (this.parent) {
        return `${this.parent.path}/${this.name}`;
      }

      return this.name;
    }

    async size() {
      if (this.kind === "file") {
        const file = await this.file();
        return file.size;
      }

      return null;
    }

    async copyTo(targetHandle, name) {
      const [finalTarget, finalName] = await resolveTargetAndName(
        targetHandle,
        name,
        "copy",
        this
      );

      // 如果是文件，直接复制文件内容
      if (this.kind === "file") {
        const newHandle = await finalTarget.get(finalName, {
          create: "file",
        });
        await newHandle.write(await this.file());

        return newHandle;
      }

      // 创建目标目录
      const newDir = await finalTarget.get(finalName, {
        create: "dir",
      });

      // 递归复制所有子文件和子目录
      for await (const [entryName, entry] of this.entries()) {
        await entry.copyTo(newDir, entryName);
      }

      return newDir;
    }

    async moveTo(targetHandle, name) {
      const [finalTarget, finalName] = await resolveTargetAndName(
        targetHandle,
        name,
        "move",
        this
      );

      // 如果是文件，直接移动文件
      if (this.kind === "file") {
        const newHandle = await finalTarget.get(finalName, {
          create: "file",
        });
        await newHandle.write(await this.file());
        await this.remove();
        return newHandle;
      }

      // 如果是目录，先创建新目录
      const newDir = await finalTarget.get(finalName, {
        create: "dir",
      });

      // 递归移动所有子文件和子目录
      for await (const [entryName, entry] of this.entries()) {
        await entry.moveTo(newDir, entryName);
      }

      // 删除原目录
      await this.remove();

      return newDir;
    }

    toJSON() {
      debugger;
      return {
        name: this.name,
        path: this.path,
      };
    }

    // 监听文件系统变化
    async observe(func) {
      const obj = {
        func,
        handle: this,
      };
      observers.add(obj);

      return () => {
        observers.delete(obj);
      };
    }
  }

  // 监听文件系统变化
  const castChannel = new BroadcastChannel("nonefs-system-handle-change");
  castChannel.onmessage = (event) => {
    // 通知所有的观察者
    notify(
      {
        ...event.data,
      },
      true
    );
  };

  // 观察者集合
  const observers = new Set();

  // 文件发生变动，就除法这个方法，通知所有的观察者
  const notify = ({ path, ...others }, isCast) => {
    if (!isCast) {
      // 通知其他标签页的文件系统变化
      castChannel.postMessage({
        path,
        ...others,
      });
    }

    observers.forEach((observer) => {
      // 只通知当前目录下或文件的观察者
      if (path.includes(observer.handle.path)) {
        observer.func({
          path,
          ...others,
        });
      }
    });
  };

  // 处理目标路径和文件名
  const resolveTargetAndName = async (targetHandle, name, methodName, self) => {
    // 处理第一个参数为字符串的情况
    let finalTarget = targetHandle;
    let finalName = name;

    if (typeof targetHandle === "string") {
      finalName = targetHandle;
      finalTarget = self.parent;
    }
    // 如果目标句柄和当前句柄相同，则不需要移动
    if (await self.isSame(finalTarget)) {
      return self;
    }

    // 检查目标路径是否为当前路径的子目录
    const targetPath = finalTarget.path;
    const currentPath = self.path;
    if (targetPath.startsWith(currentPath + "/")) {
      throw new Error(`Cannot ${methodName} a directory into its subdirectory`);
    }

    // 获取目标文件名，如果没有提供则使用原文件名
    finalName = finalName || self.name;

    return [finalTarget, finalName];
  };

  class BaseHandle extends PublicBaseHandle {
    // 对OPFS进行封装
    #originHandle = null;
    constructor(dirHandle, options = {}) {
      super(options);
      this.#originHandle = dirHandle;
    }

    get _handle() {
      return this.#originHandle;
    }

    get name() {
      return this.#originHandle.name;
    }

    async isSame(target) {
      return this.#originHandle.isSameEntry(target._handle);
    }

    async remove() {
      const parent = this.parent;

      // 最后删除当前目录或文件
      await parent.#originHandle.removeEntry(this.#originHandle.name, {
        recursive: true,
      });

      notify({
        type: "remove",
        path: this.path,
      });
    }
  }

  class PublicFileHandle {
    async file(options) {
      return this.read({
        ...options,
        type: "file",
      });
    }

    async text(options) {
      return this.read({
        ...options,
        type: "text",
      });
    }

    async buffer(options) {
      return this.read({
        ...options,
        type: "buffer",
      });
    }

    async base64(options) {
      const file = await this.file(options);
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve(reader.result);
        };
        reader.onerror = (error) => {
          reject(error);
        };
        reader.readAsDataURL(file);
      });
    }

    async lastModified() {
      return (await this.file()).lastModified;
    }

    get kind() {
      return "file";
    }
  }

  // 扩展 FileHandle 的方法
  const extendFileHandle = async (FileHandle) => {
    const propDescs = Object.getOwnPropertyDescriptors(
      PublicFileHandle.prototype
    );
    delete propDescs.constructor;

    Object.defineProperties(FileHandle.prototype, propDescs);
  };

  class FileHandle extends BaseHandle {
    constructor(...args) {
      super(...args);
    }

    // 读取文件
    async read(options = {}) {
      // options = {
      //   type: "text",
      //   start: "",
      //   end: "",
      // };

      let file = await this._handle.getFile();
      if (options.start || options.end) {
        file = file.slice(options.start, options.end);
      }
      switch (options.type) {
        case "file":
          return file;
        case "text":
          return file.text();
        case "buffer":
          return file.arrayBuffer();
        default:
          return file.text();
      }
    }

    async write(data, options = {}) {
      const handle = this._handle;
      const steam = await handle.createWritable();
      await steam.write(data);
      await steam.close();

      notify({
        path: this.path,
        type: "write",
        data,
        remark: options.remark,
      });
    }
  }

  extendFileHandle(FileHandle);

  class PublicDirHandle {
    async _getByMultiPath(name, options) {
      const { create } = options || {};

      const names = name.split("/");
      let handle = this;
      while (names.length) {
        const name = names.shift();
        let innerCreate;
        if (create) {
          if (names.length) {
            innerCreate = "dir";
          } else {
            innerCreate = create;
          }
        }
        handle = await handle.get(name, {
          create: innerCreate,
        });
      }

      return handle;
    }

    async *entries() {
      for await (let key of this.keys()) {
        const handle = await this.get(key);
        yield [key, handle];
      }
    }

    async *values() {
      for await (let [key, value] of this.entries()) {
        yield value;
      }
    }

    async some(callback) {
      // 遍历目录，如果回调返回true则提前退出
      for await (let [key, value] of this.entries()) {
        if (await callback(value, key, this)) {
          break;
        }
      }
    }

    async forEach(callback) {
      // 遍历目录
      for await (let [key, value] of this.entries()) {
        await callback(value, key, this);
      }
    }

    // 扁平化获取所有的子文件（包括多级子孙代）
    async flat() {
      const result = [];
      // 遍历当前目录下的所有文件和文件夹
      for await (const [name, handle] of this.entries()) {
        // 只有非目录类型才加入结果数组
        if (handle.kind !== "dir") {
          result.push(handle);
        } else {
          // 如果是文件夹，只获取其子文件
          const children = await handle.flat();
          result.push(...children);
        }
      }
      return result;
    }

    get kind() {
      return "dir";
    }
  }

  // 扩展 DirHandle 的方法
  const extendDirHandle = async (DirHandle) => {
    const propDescs = Object.getOwnPropertyDescriptors(PublicDirHandle.prototype);
    delete propDescs.constructor;

    Object.defineProperties(DirHandle.prototype, propDescs);
  };

  class DirHandle extends BaseHandle {
    constructor(...args) {
      super(...args);
    }

    async get(name, options) {
      const { create } = options || {};

      if (name.includes("/")) {
        return await this._getByMultiPath(name, options);
      }

      // 先尝试获取文件，在尝试获取目录，看有没有同名的文件
      let beforeOriHandle = await this._handle
        .getFileHandle(name)
        .catch(() => null);
      if (!beforeOriHandle) {
        beforeOriHandle = await this._handle
          .getDirectoryHandle(name)
          .catch(() => null);
      }

      if (!create && !beforeOriHandle) {
        //   throw new Error(`${name} is not exist`);
        // 找不到文件或文件夹，返回null
        return null;
      }

      if (beforeOriHandle) {
        // 如果存在文件，看是否与 create 参数冲突
        if (create === "file" && beforeOriHandle.kind !== "file") {
          throw new Error(`${name} is not a file`);
        } else if (create === "dir" && beforeOriHandle.kind !== "directory") {
          throw new Error(`${name} is not a directory`);
        }
      } else {
        // 不存在的话，进行创建
        // 根据方式获取参数
        let funcName = "getDirectoryHandle";
        if (options.create === "file") {
          funcName = "getFileHandle";
        }

        beforeOriHandle = await this._handle[funcName](name, {
          create: true,
        });
      }

      // 根据handle类型返回
      if (beforeOriHandle.kind === "file") {
        return new FileHandle(beforeOriHandle, {
          parent: this,
          root: this.root || this,
        });
      } else if (beforeOriHandle.kind === "directory") {
        return new DirHandle(beforeOriHandle, {
          parent: this,
          root: this.root || this,
        });
      }

      return null;
    }

    // 获取子文件数量
    async length() {
      let count = 0;
      // 遍历目录下所有文件和文件夹
      for await (const [name, handle] of this._handle.entries()) {
        count++;
      }
      return count;
    }

    async *keys() {
      for await (let key of this._handle.keys()) {
        yield key;
      }
    }
  }

  extendDirHandle(DirHandle);

  const get$2 = async (path, options) => {
    // 获取根目录
    const opfsRoot = await navigator.storage.getDirectory();

    // 解析路径
    const pathParts = path.split("/").filter(Boolean);

    if (pathParts.length === 0) {
      throw new Error("路径不能为空");
    }

    // 获取根空间名称
    const rootName = pathParts[0];

    try {
      // 尝试获取根目录句柄
      const rootDir = await opfsRoot.getDirectoryHandle(rootName);
      const dirHandle = new DirHandle(rootDir);

      // 如果只有根目录，直接返回
      if (pathParts.length === 1) {
        return dirHandle;
      }

      // 通过根目录，使用get方法获取剩余路径
      const remainingPath = pathParts.slice(1).join("/");
      return await dirHandle.get(remainingPath, options);
    } catch (error) {
      if (error.name === "NotFoundError") {
        throw new Error(
          `根目录 "${rootName}" 不存在，请先使用 init("${rootName}") 初始化`,
          {
            cause: error,
          }
        );
      }
      throw error;
    }
  };

  // 主体数据库对象
  let mainDB = null;

  // 获取数据库
  const getDB = async () => {
    if (!mainDB) {
      mainDB = new Promise((resolve, reject) => {
        const request = indexedDB.open("noneos_fs_db", 1);

        request.onupgradeneeded = function (event) {
          const db = event.target.result;
          const objectStore = db.createObjectStore("files", {
            keyPath: "id",
          });
          objectStore.createIndex("parent", "parent", { unique: false });
          objectStore.createIndex("name", "name", { unique: false });
          objectStore.createIndex("parentAndName", ["parent", "name"], {
            // 父文件夹下只能有一个同名文件夹或文件
            unique: true,
          });
        };

        request.onsuccess = function (event) {
          const db = event.target.result;

          request.onclose = function () {
            mainDB = null;
          };

          resolve(db);
        };

        request.onerror = function (event) {
          reject(event.target.error);
          mainDB = null;
        };
      });
    }

    return mainDB;
  };

  // 从数据库中获取数据
  const getData = async ({ indexName, index, method = "get" }) => {
    const db = await getDB();

    let request = db.transaction(["files"], "readonly").objectStore("files");

    if (indexName) {
      request = request.index(indexName);
    }

    return new Promise((resolve, reject) => {
      request = request[method](index);

      request.onsuccess = function (event) {
        resolve(event.target.result);
      };

      request.onerror = function (event) {
        reject(event.target.error);
      };
    });
  };

  // 向数据库中设置数据
  const setData = async ({ puts, deletes }) => {
    const db = await getDB();

    const transaction = db.transaction(["files"], "readwrite");

    const objectStore = transaction.objectStore("files");

    return new Promise((resolve, reject) => {
      // 存储所有put操作的ID
      const putIds = [];

      transaction.oncomplete = function () {
        // 完成时返回所有成功操作的ID
        resolve(putIds);
      };

      transaction.onerror = function (event) {
        reject(event.target.error);
      };

      puts &&
        puts.forEach((data) => {
          objectStore.put(data);
        });

      deletes &&
        deletes.forEach((data) => {
          objectStore.delete(data);
        });
    });
  };

  // 生成随机文件id
  function getRandomId(length = 10) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => ("0" + byte.toString(32)).slice(-2)).join(
      ""
    );
  }

  class BaseDBHandle extends PublicBaseHandle {
    #name;
    #dbId;

    constructor({ name, dbId, root, parent }) {
      super({
        root,
        parent,
      });
      this.#name = name;
      this.#dbId = dbId;
    }

    get _dbid() {
      return this.#dbId;
    }

    get name() {
      return this.#name;
    }

    isSame(target) {
      return this.#dbId === target._dbid;
    }

    async remove() {
      if (this.kind === "dir") {
        // 先删除所有子文件
        for await (let e of this.values()) {
          await e.remove();
        }
      }
      // 再删除自己
      await setData({
        deletes: [this.#dbId],
      });
      notify({
        type: "remove",
        path: this.path,
      });
    }
  }

  /**
   * @file util.js
   * @author yao
   * 传入一个数据，计算哈希值
   * @param {ArrayBuffer|Blob|String} data 数据
   * @return {Promise<string>} 哈希值
   */

  // 查看是否Safari
  const isSafari = (() => {
    const ua = navigator.userAgent.toLowerCase();
    return ua.includes("safari") && !ua.includes("chrome");
  })();

  class FileDBHandle extends BaseDBHandle {
    constructor(...args) {
      super(...args);
    }

    async read(options = {}) {
      // options = {
      //   type: "text",
      //   start: "",
      //   end: "",
      // };
      const targetData = await getData({
        index: this._dbid,
      });

      let file = targetData.file;

      if (!file) {
        return null;
      }

      if (isSafari) {
        // safari存储的是 arrayBuffer，需要转成file
        if (targetData.fileInfo) {
          file = new File([file], this.name, targetData.fileInfo);
        } else {
          file = new File([file], this.name);
        }
      }

      if (options.start || options.end) {
        file = file.slice(options.start, options.end);
      }

      switch (options.type) {
        case "file":
          return file;
        case "text":
          return file.text();
        case "buffer":
          return file.arrayBuffer();
        default:
          return file.text();
      }
    }

    async write(data, options = {}) {
      let finalData = data;

      if (!isSafari) {
        // 将data转换为file，file可能是不同的类型
        if (
          typeof data === "string" ||
          data instanceof ArrayBuffer ||
          data instanceof Uint8Array
        ) {
          finalData = new File([data], this.name, {
            type: "text/plain",
          });
        }

        // 最终不是file类型，直接报错
        if (!(finalData instanceof File)) {
          throw new Error("data must be file, string, Uint8Array or ArrayBuffer");
        }
      } else {
        // 如果是safari，就转成 arrayBuffer
        if (typeof data === "string") {
          finalData = new TextEncoder().encode(data);
        } else if (data instanceof Blob) {
          finalData = await data.arrayBuffer();
        }

        // 如果不是arrayBuffer，直接报错
        if (
          !(finalData instanceof Uint8Array || finalData instanceof ArrayBuffer)
        ) {
          throw new Error("data must be file, string, Uint8Array or ArrayBuffer");
        }
      }

      const targetData = await getData({
        index: this._dbid,
      });

      if (isSafari) {
        // 带上原始文件信息
        if (data instanceof File) {
          targetData.fileInfo = {
            type: data.type,
            lastModified: data.lastModified,
          };
        }
      }

      // 写入文件
      targetData.file = finalData;
      await setData({ puts: [targetData] });

      notify({
        path: this.path,
        type: "write",
        data,
        remark: options.remark,
      });
    }
  }

  extendFileHandle(FileDBHandle);

  class DirDBHandle extends BaseDBHandle {
    constructor(...args) {
      super(...args);
    }
    async get(name, options = {}) {
      if (name.includes("/")) {
        return await this._getByMultiPath(name, options);
      }

      let targetData = await getData({
        indexName: "parentAndName",
        index: [this._dbid, name],
      });

      if (!targetData && !options.create) {
        return null;
      }

      // 不存在的话，判断是否需要创建
      if (
        !targetData &&
        (options.create === "file" || options.create === "dir")
      ) {
        targetData = {
          id: getRandomId(),
          name,
          parent: this._dbid,
          type: options.create,
        };

        await setData({
          puts: [targetData],
        });
      }

      if (targetData.type === "file") {
        return new FileDBHandle({
          name: targetData.name,
          dbId: targetData.id,
          parent: this,
          root: this.root,
        });
      } else if (targetData.type === "dir") {
        return new DirDBHandle({
          name: targetData.name,
          dbId: targetData.id,
          parent: this,
          root: this.root,
        });
      }

      return null;
    }

    async length() {
      return await getData({
        indexName: "parent",
        index: this._dbid,
        method: "count",
      });
    }

    async *keys() {
      let datas = await getData({
        indexName: "parent",
        index: this._dbid,
        method: "getAll",
      });

      for (const item of datas) {
        yield item.name;
      }
    }
  }

  extendDirHandle(DirDBHandle);

  // safari专供的文件系统，因为它的 servers worker 不支持 getDirectoryHandle

  const get$1 = async (path, options) => {
    // 解析路径
    const pathParts = path.split("/").filter(Boolean);

    if (pathParts.length === 0) {
      throw new Error("路径不能为空");
    }

    // 获取根空间名称
    const rootName = pathParts[0];

    // 从数据库中查询对应的文件/目录数据
    const data = await getData({
      indexName: "parentAndName",
      index: ["root", rootName],
    });

    // 如果数据不存在，返回 null
    if (!data) {
      return null;
    }

    // 根据类型返回对应的 handle
    const rootHandle = new DirDBHandle({
      name: data.name,
      dbId: data.id,
    });

    return await rootHandle.get(pathParts.slice(1).join("/"), options);
  };

  const get = async (path, options) => {
    return !isSafari
      ? get$2(path, options)
      : get$1(path, options);
  };

  // 响应文件相关的请求
  const resposeFs = (event) => {
    const { request } = event;
    const { pathname, origin, searchParams } = new URL(request.url);

    const paths = pathname.split("/");
    const filepath = [paths[1].replace("$", ""), ...paths.slice(2)].join("/");

    event.respondWith(
      (async () => {
        try {
          const fileHandle = await get(filepath);

          const prefix = pathname.split(".").pop();

          const headers = {};
          headers["Content-Type"] = getContentType(prefix);

          return new Response(await fileHandle.file(), {
            status: 200,
            headers,
          });
        } catch (err) {
          return new Response(err.stack || err.toString(), {
            status: 400,
          });
        }
      })()
    );
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

  self.addEventListener("fetch", (event) => {
    const { request } = event;
    const { pathname, origin, searchParams } = new URL(request.url);

    // 只处理同源的请求
    if (location.origin === origin) {
      // 请求本地文件，会$开头
      if (/^\/\$/.test(pathname)) {
        resposeFs(event);
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

})();
