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

  /**
   * @file util.js
   * @author yao
   * 传入一个数据，计算哈希值
   * @param {ArrayBuffer|Blob|String} data 数据
   * @return {Promise<string>} 哈希值
   */
  const getHash = async (data) => {
    if (!globalThis.crypto) {
      // Node.js 环境
      const crypto = await import('crypto');
      if (typeof data === "string") {
        data = new TextEncoder().encode(data);
      } else if (data instanceof Blob) {
        data = await data.arrayBuffer();
      }
      const hash = crypto.createHash("sha256");
      hash.update(Buffer.from(data));
      return hash.digest("hex");
    } else {
      // 浏览器环境
      if (typeof data === "string") {
        data = new TextEncoder().encode(data);
      } else if (data instanceof Blob) {
        data = await data.arrayBuffer();
      }
      const hash = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hash));
      const hashHex = hashArray
        .map((bytes) => bytes.toString(16).padStart(2, "0"))
        .join("");
      return hashHex;
    }
  };

  // 查看是否Safari
  (() => {
    const ua = navigator.userAgent.toLowerCase();
    return ua.includes("safari") && !ua.includes("chrome");
  })();

  // 直接保存，没有使用队列
  const directSaveToCache = async ({ cache, path, data, type }) => {
    // 规范化路径
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;

    console.log("saveCache start", normalizedPath, "data:", data);
    try {
      const content = type === "dir" ? JSON.stringify(data) : data;
      const resp = new Response(content, {
        headers: {
          "x-type": type,
          "cache-control": "no-cache",
        },
      });
      await cache.put(normalizedPath, resp);
    } finally {
      console.log("saveCache end", normalizedPath, "data:", data);
    }
  };

  const directGetCache = async (cache, path) => {
    // 规范化路径
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;

    const matched = await cache.match(normalizedPath);

    if (!matched) {
      return {
        type: null,
        data: null,
      };
    }

    const type = matched.headers.get("x-type");

    try {
      if (!matched.body) {
        return {
          type,
          data: matched.body,
        };
      }
      // 获取 readsteam 数据
      const blob = await streamToBlob(matched.body);

      // 根据类型处理数据
      const data = type === "dir" ? JSON.parse(await blob.text()) : blob;

      return {
        type,
        data,
      };
    } catch (error) {
      console.error("Error processing cache data:", error);
      return {
        type: null,
        data: null,
        error: error.message,
      };
    }
  };

  // 保存
  const saveCache = async ({ cache, path, data, type }) => {
    // 规范化路径
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;

    return executeInQueue(normalizedPath, async () => {
      await directSaveToCache({
        cache,
        path,
        data,
        type,
      });
    });
  };

  // 获取缓存
  const getCache = async (cache, path) => {
    // 规范化路径
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;

    return executeInQueue(normalizedPath, async () => {
      return await directGetCache(cache, path);
    });
  };

  // 确保缓存
  const ensureCache = async ({ cache, path, type: enType }) => {
    // 规范化路径
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;

    return executeInQueue(normalizedPath, async () => {
      const { type, data } = await directGetCache(cache, normalizedPath);

      if (type) {
        return;
      }

      let finalData = null;
      if (enType === "dir") {
        finalData = [];
      } else if (enType === "file") {
        finalData = "";
      }

      console.log(`新创建路径: ${normalizedPath}, 类型: ${enType}`);
      await directSaveToCache({
        type: enType,
        cache,
        data: finalData,
        path: normalizedPath,
      });
    });
  };

  // 目录添加子目录或子文件信息
  const updateDir = async ({ cache, path, remove, add }) => {
    // 规范化路径
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;

    return executeInQueue(normalizedPath, async () => {
      // 获取当前目录的缓存数据
      const { data: currentData } = await directGetCache(cache, normalizedPath);

      // 如果目录不存在，抛出错误
      if (!currentData) {
        throw new Error(`目录不存在: ${normalizedPath}`);
      }

      // 创建目录数据的副本
      let updatedData = Array.isArray(currentData) ? [...currentData] : [];

      // 处理需要移除的项目
      if (remove && remove.length > 0) {
        updatedData = updatedData.filter((item) => !remove.includes(item));
      }

      // 处理需要添加的项目
      if (add && add.length > 0) {
        // 过滤掉已存在的项目，避免重复
        const newItems = add.filter((item) => !updatedData.includes(item));
        updatedData = [...updatedData, ...newItems];
      }

      // 保存更新后的目录数据
      await directSaveToCache({
        cache,
        path: normalizedPath,
        type: "dir",
        data: updatedData,
      });

      return updatedData;
    });
  };

  // 将ReadableStream转为Blob
  const streamToBlob = async (stream) => {
    const reader = stream.getReader();
    let finalBlob = new Blob([]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      // 为每个数据块创建一个新的 Blob 并与之前的合并
      finalBlob = new Blob([finalBlob, value]);
    }

    return finalBlob;
  };

  // 队列处理器
  const queue = new Map();
  const executeInQueue = async (key, operation) => {
    const current = queue.get(key) || Promise.resolve();
    const next = current.then(async () => {
      try {
        return await operation();
      } finally {
        if (queue.get(key) === next) {
          queue.delete(key);
        }
      }
    });
    queue.set(key, next);
    return next;
  };

  class BaseCacheHandle extends PublicBaseHandle {
    #cache = null;
    #name = null;

    constructor(name, cache, options) {
      const { parent, root } = options || {};
      super({ parent, root });

      this.#name = name;
      this.#cache = cache;
    }

    async id() {
      return await getHash(this.path);
    }

    get _cache() {
      return this.#cache;
    }

    get name() {
      return this.#name;
    }

    async isSame(target) {
      return (
        this.#cache[Symbol.toStringTag] === target.#cache[Symbol.toStringTag] &&
        this.path === target.path
      );
    }

    async remove() {
      if (this.kind === "dir") {
        // 先递归删除子目录和文件
        for await (let e of this.values()) {
          await e.remove();
        }
      }

      const parent = this.parent;

      // 从父目录中移除
      await updateDir({
        cache: this._cache,
        path: parent.path,
        remove: [this.name],
      });

      // 删除自身缓存
      await this._cache.delete("/" + this.path);

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

  class FileCacheHandle extends BaseCacheHandle {
    constructor(...args) {
      super(...args);

      ensureCache({
        cache: this._cache,
        path: this.path,
        type: "file",
      });
    }

    async read(options = {}) {
      const { data } = await getCache(this._cache, this.path);

      if (!data) {
        return options.type === "buffer" ? new ArrayBuffer(0) : "";
      }

      // 处理 Blob 类型数据
      const blobData = data instanceof Blob ? data : new Blob([data]);

      switch (options.type) {
        case "buffer":
          return await blobData.arrayBuffer();
        case "file":
          return blobData;
        case "text":
        default:
          return await blobData.text();
      }
    }

    async write(data, options = {}) {
      // 修改这里，使用 saveCache 替代 setCache
      await saveCache({
        cache: this._cache,
        path: this.path,
        type: "file",
        data,
      });

      notify({
        path: this.path,
        type: "write",
        data,
        remark: options.remark,
      });
    }
  }

  extendFileHandle(FileCacheHandle);

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

  class DirCacheHandle extends BaseCacheHandle {
    constructor(...args) {
      super(...args);

      ensureCache({
        cache: this._cache,
        path: this.path,
        type: "dir",
      });
    }

    async get(name, options) {
      const { create } = options || {};

      if (name.includes("/")) {
        return await this._getByMultiPath(name, options);
      }

      // 先判断是否存在
      const targetPath = `${this.path}/${name}`;

      // 获取目标路径的缓存数据
      const { type: cachedType } = await getCache(this._cache, targetPath);

      // 最终创建handle的类型，默认为传入的create，或者已存在的类型
      let finnalType = create || cachedType;

      if (cachedType) {
        if (!create) {
          finnalType = cachedType;
        } else if (cachedType !== create) {
          // 如果存在且类型不匹配，则报错
          throw new Error(
            `Type mismatch: ${targetPath} is ${cachedType}, not ${create}`
          );
        }
      } else if (!create) {
        return null;
      }

      let finalHandle = null;

      // 更新目录信息
      await updateDir({
        cache: this._cache,
        path: this.path,
        add: [name],
      });

      // 创建对应类型的 handle
      if (finnalType === "file") {
        finalHandle = new FileCacheHandle(name, this._cache, {
          parent: this,
          root: this.root,
        });
      } else if (finnalType === "dir") {
        finalHandle = new DirCacheHandle(name, this._cache, {
          parent: this,
          root: this.root,
        });
      }

      return finalHandle;
    }

    async length() {
      const { data } = await getCache(this._cache, this.path);
      return Array.isArray(data) ? data.length : 0;
    }

    async *keys() {
      const { data } = await getCache(this._cache, this.path);
      if (Array.isArray(data)) {
        for (const key of data) {
          yield key;
        }
      }
    }
  }

  extendDirHandle(DirCacheHandle);

  const get$1 = async (path, options) => {
    const pathParts = path.split("/").filter(Boolean);

    if (pathParts.length === 0) {
      throw new Error("路径不能为空");
    }

    const rootName = pathParts[0];

    try {
      // 尝试获取根目录缓存
      const cache = await caches.open(rootName);
      const dirHandle = new DirCacheHandle(rootName, cache);

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

  // import {
  //   get as systemHandleGet,
  //   init as systemHandleInit,
  // } from "./handle/main.js";


  const get = async (path, options) => {
    return get$1(path, options);
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
