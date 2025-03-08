(function () {
  'use strict';

  // 对OPFS进行封装
  class BaseHandle {
    #originHandle = null;
    #parent;
    #root;
    constructor(dirHandle, options = {}) {
      this.#originHandle = dirHandle;
      this.#root = options.root;
      this.#parent = options.parent;
    }

    get handle() {
      return this.#originHandle;
    }

    get name() {
      return this.#originHandle.name;
    }

    get path() {
      if (this.#parent) {
        return `${this.#parent.path}/${this.#originHandle.name}`;
      }

      return this.#originHandle.name;
    }

    async size() {
      if (this.kind === "file") {
        const file = await this.file();
        return file.size;
      }

      return null;
    }

    async isSame(target) {
      return this.#originHandle.isSameEntry(target.handle);
    }

    async parent() {
      return this.#parent;
    }

    async root() {
      return this.#root || this;
    }

    async remove() {
      const parent = await this.parent();

      // 最后删除当前目录或文件
      await parent.#originHandle.removeEntry(this.#originHandle.name, {
        recursive: true,
      });
    }

    async moveTo() {}

    async copyTo() {}
  }

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

      let file = await this.handle.getFile();
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

    async write(data) {
      const handle = this.handle;
      const steam = await handle.createWritable();
      await steam.write(data);
      await steam.close();
    }

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

  class DirHandle extends BaseHandle {
    constructor(...args) {
      super(...args);
    }

    async get(name, options) {
      const { create } = options || {};

      // 多重路径进行递归
      if (name.includes("/")) {
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

      // 先尝试获取文件，在尝试获取目录，看有没有同名的文件
      let beforeOriHandle = await this.handle
        .getFileHandle(name)
        .catch(() => null);
      if (!beforeOriHandle) {
        beforeOriHandle = await this.handle
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

        beforeOriHandle = await this.handle[funcName](name, {
          create: true,
        });
      }

      // 根据handle类型返回
      if (beforeOriHandle.kind === "file") {
        return new FileHandle(beforeOriHandle, {
          parentPath: this.path,
          parent: this,
          root: (await this.root()) || this,
        });
      } else if (beforeOriHandle.kind === "directory") {
        return new DirHandle(beforeOriHandle, {
          parentPath: this.path,
          parent: this,
          root: (await this.root()) || this,
        });
      }

      return null;
    }

    get kind() {
      return "dir";
    }

    // 获取子文件数量
    async length() {
      let count = 0;
      // 遍历目录下所有文件和文件夹
      for await (const [name, handle] of this.handle.entries()) {
        count++;
      }
      return count;
    }

    async *keys() {
      for await (let key of this.handle.keys()) {
        yield key;
      }
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
  }

  // 响应文件相关的请求
  const resposeFs = (event) => {
    const { request } = event;
    const { pathname, origin, searchParams } = new URL(request.url);

    const paths = pathname.split("/");
    // 获取根目录文件夹
    const rootName = paths[1].replace(/^\$/, "");
    const filepath = paths.slice(2).join("/");

    event.respondWith(
      (async () => {
        try {
          const rootSystemHandle = await navigator.storage.getDirectory();

          const rootHandle = new DirHandle(
            await rootSystemHandle.getDirectoryHandle(rootName)
          );

          const fileHandle = await rootHandle.get(filepath);

          console.log("sw:", {
            rootName,
            pathname,
            rootHandle,
            filepath,
            fileHandle,
          });

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
