(function () {
  'use strict';

  // 对OPFS进行封装
  class BaseHandle {
    #originHandle = null;
    #parentPath;
    constructor(dirHandle, options = {}) {
      this.#originHandle = dirHandle;
      this.#parentPath = options.parentPath;
    }

    get handle() {
      return this.#originHandle;
    }

    async kind() {
      return this.#originHandle.kind;
    }

    get path() {
      if (this.#parentPath) {
        return `${this.#parentPath}/${this.#originHandle.name}`;
      }

      return this.#originHandle.name;
    }
  }

  // const writerWorkerPath = import.meta.resolve("./fs-write-worker.js");

  // const isSafari =
  //   navigator.userAgent.includes("Safari") &&
  //   !navigator.userAgent.includes("Chrome");

  class FileHandle extends BaseHandle {
    constructor(...args) {
      super(...args);
    }

    // 读取文件
    async read(options) {
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
      // const { path } = await this;

      // if (isSafari) {
      //   return new Promise((resolve, reject) => {
      //     const worker = new Worker(writerWorkerPath);
      //     worker.postMessage({
      //       // fileHandle: this.handle,
      //       path,
      //       content: data,
      //     });
      //     worker.onmessage = async (event) => {
      //       const { success, error } = event.data;

      //       // BUG: 这里需要一个延时，否则写入的文件会丢失
      //       await new Promise((resolve) => setTimeout(resolve, 100));

      //       if (success) {
      //         console.log("文件写入成功！");
      //         resolve(true);
      //       } else {
      //         reject(error);
      //       }

      //       worker.terminate();
      //     };
      //   });
      // }

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
      debugger;
    }

    get lastModified() {
      return this.file.lastModified;
    }
  }

  class DirHandle extends BaseHandle {
    constructor(...args) {
      super(...args);
    }

    async get(name, options) {
      const { create } = options || {};

      // 先尝试获取文件，在尝试获取目录，看有没有同名的文件
      let beforeHandle = await this.handle.getFileHandle(name).catch(() => null);
      if (!beforeHandle) {
        beforeHandle = await this.handle
          .getDirectoryHandle(name)
          .catch(() => null);
      }

      if (!create && !beforeHandle) {
        //   throw new Error(`${name} is not exist`);
        // 找不到文件或文件夹，返回null
        return null;
      }

      if (beforeHandle) {
        // 如果存在文件，看是否与 create 参数冲突
        if (create === "file" && beforeHandle.kind !== "file") {
          throw new Error(`${name} is not a file`);
        } else if (create === "dir" && beforeHandle.kind !== "directory") {
          throw new Error(`${name} is not a directory`);
        }
      } else {
        // 不存在的话，进行创建
        // 根据方式获取参数
        let funcName = "getDirectoryHandle";
        if (options.create === "file") {
          funcName = "getFileHandle";
        }

        beforeHandle = await this.handle[funcName](name, {
          create: true,
        });
      }

      // 根据handle类型返回
      if (beforeHandle.kind === "file") {
        return new FileHandle(beforeHandle, {
          parentPath: this.path,
        });
      } else if (beforeHandle.kind === "dir") {
        return new DirHandle(beforeHandle, {
          parentPath: this.path,
        });
      }

      // 不应该存在的情况会到这里
      debugger;
    }

    remove() {}
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
