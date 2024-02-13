(function () {
  'use strict';

  // 替换这个基础库，理论是可以兼容各个环境
  class NBaseHandle {
    #root;
    #relates;
    constructor(handle, paths, root) {
      this.#root = root || null;
      this.#relates = paths || [];
      Object.defineProperties(this, {
        _handle: {
          value: handle,
        },
      });
    }

    get kind() {
      return this._handle?.kind || "directory";
    }

    async parent() {
      if (this.#relates.length === 0) {
        return null;
      }
      if (this.#relates.length === 1) {
        return this.root;
      }

      return this.root.get(this.relativePaths.slice(0, -1).join("/"));
    }

    get path() {
      return this.#relates.join("/");
    }

    get relativePaths() {
      return this.#relates.slice();
    }

    get root() {
      return this.#root || this;
    }

    get name() {
      return this._handle.name;
    }

    async remove(options) {
      const defaults = {
        recursive: false,
      };

      Object.assign(defaults, options);

      if (this._handle.remove) {
        await this._handle.remove(defaults);
      } else {
        const parent = await this.parent();
        await parent.removeEntry(this.name, defaults);
      }

      return true;
    }

    async move(...args) {
      const { _handle } = this;
      if (_handle.move) {
        switch (args.length) {
          case 2:
            await _handle.move(args[0]._handle, args[1]);
            return true;
          case 1:
            if (typeof args[0] === "string") {
              await _handle.move(args[0]);
            } else {
              await _handle.move(args[0]._handle);
            }
            return true;
        }
      } else {
        let name, parHandle;
        switch (args.length) {
          case 2:
            parHandle = args[0];
            name = args[1];
          case 1:
            if (typeof args[0] === "string") {
              name = args[0];
            } else {
              parHandle = args[0];
            }
        }

        if (!parHandle) {
          // 文件夹重命名
          parHandle = await this.parent();
        }

        // 一维化所有文件
        const files = await flatFiles(this, [name]);

        for (let item of files) {
          if (item.kind === "file") {
            const realPar = await parHandle.get(item.parNames.join("/"), {
              create: "directory",
            });
            await item.handle.move(realPar, item.name);
          } else {
            await parHandle.get(item.parNames.join("/"), {
              create: "directory",
            });
          }
        }

        await this.remove({ recursive: true });
      }
    }
  }

  async function flatFiles(parHandle, parNames = []) {
    const files = [];
    let isEmpty = true;

    for await (let [name, handle] of parHandle.entries()) {
      isEmpty = false;
      if (handle.kind === "file") {
        files.push({
          kind: "file",
          name,
          handle,
          parNames,
        });
      } else {
        const subFiles = await flatFiles(handle, [...parNames, name]);
        files.push(...subFiles);
      }
    }

    if (isEmpty) {
      files.push({
        kind: "dir",
        parNames,
      });
    }

    return files;
  }

  class NDirHandle extends NBaseHandle {
    constructor(handle, paths, root) {
      super(handle, paths, root);
    }

    async get(name, options) {
      const defaults = {
        create: null, // "directory" or "file"
      };

      Object.assign(defaults, options);

      // 去掉最头部的 "/"
      name = name.replace(/^\//, "");

      const paths = name.split("/");
      const lastId = paths.length - 1;

      let targetHandle = this._handle;
      let count = 0;

      for (let name of paths) {
        if (name === "node_modules") {
          continue;
        }

        if (count === lastId) {
          if (defaults.create) {
            try {
              switch (defaults.create) {
                case "file":
                  targetHandle = await targetHandle.getFileHandle(name, {
                    create: true,
                  });
                  break;
                case "directory":
                  targetHandle = await targetHandle.getDirectoryHandle(name, {
                    create: true,
                  });
                  break;
              }
            } catch (err) {
              throw err;
            }
          } else {
            let lastHandle;
            try {
              lastHandle = await targetHandle.getDirectoryHandle(name);
            } catch (err) {
              try {
                lastHandle = await targetHandle.getFileHandle(name);
              } catch (err2) {
                throw err2;
              }
            }

            targetHandle = lastHandle;
          }
          break;
        }

        targetHandle = await targetHandle.getDirectoryHandle(name, {
          create: !!defaults.create,
        });

        count++;
      }

      if (targetHandle.kind === "file") {
        return new NFileHandle(
          targetHandle,
          [...this.relativePaths, ...paths],
          this.root
        );
      } else if (targetHandle.kind === "directory") {
        return new NDirHandle(
          targetHandle,
          [...this.relativePaths, ...paths],
          this.root
        );
      }

      return null;
    }

    async *entries() {
      for await (let [name, handle] of this._handle.entries()) {
        if (handle.kind === "file") {
          yield [
            name,
            new NFileHandle(handle, [...this.relativePaths, name], this.root),
          ];
        } else {
          yield [
            name,
            new NDirHandle(handle, [...this.relativePaths, name], this.root),
          ];
        }
      }
    }

    async *keys() {
      for await (let key of this._handle.keys()) {
        yield key;
      }
    }

    async *values() {
      for await (let [name, handle] of this._handle.entries()) {
        if (handle.kind === "file") {
          yield new NFileHandle(handle, [...this.relativePaths, name], this.root);
        } else {
          yield new NDirHandle(handle, [...this.relativePaths, name], this.root);
        }
      }
    }

    async removeEntry(name, options) {
      await this._handle.removeEntry(name, options);

      return true;
    }
  }

  class NFileHandle extends NBaseHandle {
    constructor(handle, paths, root) {
      super(handle, paths, root);
    }

    async write(content) {
      const writable = await this._handle.createWritable();
      await writable.write(content);
      await writable.close();
    }

    async read(options) {
      const defaults = {
        type: "file", // text buffer
      };

      Object.assign(defaults, options);

      const file = await this._handle.getFile();

      if (defaults.type === "file") {
        return file;
      }

      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(reader.result);

        switch (defaults.type) {
          case "text":
            reader.readAsText(file);
            break;
          case "buffer":
            reader.readAsArrayBuffer(file);
            break;
          case "dataurl":
            reader.readAsDataURL(file);
            break;
          default:
            reject(new Error(`"${defaults.type}" type is not supported`));
        }
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

    async stat() {
      const file = await this.read({ type: "file" });

      const result = {};

      ["lastModified", "lastModifiedDate", "name", "size", "type"].forEach(
        (k) => (result[k] = file[k])
      );

      return result;
    }
  }

  const fsId = Math.random().toString(32).slice(2);
  const filerootChannel = new BroadcastChannel("noneos-fs-channel");

  const remotes = [];

  // globalThis.remotes = remotes;

  console.log("fsId", fsId);

  const badge = (eventName, options) => {
    return new Promise((resolve, reject) => {
      const taskId = `${eventName}-${Math.random().toString(32).slice(2)}`;

      filerootChannel.postMessage({
        type: eventName,
        ...options,
        taskId,
      });

      let timer = setTimeout(() => {
        reject(`badge timeout`);
      }, 10000);

      let f = (e) => {
        const { data } = e;

        if (data.taskId === taskId) {
          filerootChannel.removeEventListener("message", f);
          clearTimeout(timer);
          resolve(data.result);
          f = null;
          timer = null;
        }
      };

      filerootChannel.addEventListener("message", f);
    });
  };

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

  const post = (data) => {
    filerootChannel.postMessage(data);
  };

  const register = (eventName, func) => {
    registerMaps[eventName] = func;
  };

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

  class RemoteBaseHandle {
    #root;
    #relates;
    #kind;
    #badge;
    constructor(paths, root, badge, kind) {
      this.#kind = kind;
      this.#root = root || null;
      this.#relates = paths || [];
      this.#badge = badge;
    }

    get kind() {
      return this.#kind;
    }

    get name() {
      return this._name || this.#relates.slice(-1)[0];
    }

    get badge() {
      return this.#badge;
    }

    async parent() {
      if (this.#relates.length === 0) {
        return null;
      }
      if (this.#relates.length === 1) {
        return this.root;
      }

      return this.root.get(this.relativePaths.slice(0, -1).join("/"));
    }

    get path() {
      return this.#relates.join("/");
    }

    get relativePaths() {
      return this.#relates.slice();
    }

    get root() {
      return this.#root || this;
    }

    async remove(options) {
      const par = await this.parent();
      return par.removeEntry(this.name, options);
    }

    async move(...args) {
      debugger;
    }

    async convery(name, args) {
      const data = await this.badge({
        func: "handle-" + name,
        paths: this.relativePaths,
        args,
        self: this,
      });

      if (data.error) {
        const error = new Error(data.error.desc);
        error.code = data.error.code;
        throw error;
      }

      return data;
    }
  }

  class RemoteDirHandle extends RemoteBaseHandle {
    constructor({ paths, root, badge, _name }) {
      super(paths, root, badge, "directory");
      if (_name) {
        this._name = _name;
      }
    }

    async get(name, options) {
      const result = await this.convery("get", [name, options]);

      if (result.kind === "file") {
        return new RemoteFileHandle({
          paths: [...this.relativePaths, name],
          root: this.root,
          badge: this.badge,
        });
      }

      return new RemoteDirHandle({
        paths: [...this.relativePaths, name],
        root: this.root,
        badge: this.badge,
      });
    }

    async *entries() {
      const result = await this.convery("entries", []);

      for (let item of result) {
        if (item.kind === "file") {
          yield [
            item.name,
            new RemoteFileHandle({
              paths: [...this.relativePaths, item.name],
              root: this.root,
              badge: this.badge,
            }),
          ];
        } else {
          yield [
            item.name,
            new RemoteDirHandle({
              paths: [...this.relativePaths, item.name],
              root: this.root,
              badge: this.badge,
            }),
          ];
        }
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
      return await this.convery("remove-entry", [name, options]);
    }
  }

  class RemoteFileHandle extends RemoteBaseHandle {
    constructor({ paths, root, badge, _name }) {
      super(paths, root, badge, "file");
      if (_name) {
        this._name = _name;
      }
    }

    async write(content) {
      return await this.convery("write", [content]);
    }

    async read(options) {
      const defaults = {
        type: "file", // text buffer
      };

      Object.assign(defaults, options);

      return await this.convery("read", [options]);
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

    async stat() {
      const file = await this.read({ type: "file" });

      const result = {};

      ["lastModified", "lastModifiedDate", "name", "size", "type"].forEach(
        (k) => (result[k] = file[k])
      );

      return result;
    }
  }

  const remoteBadge = async (options, itemFsId) => {
    const { func, name, paths, self, args } = options;
    const rootname = self.root.name;

    remotes.some((e) => {
      return e.others.some((item) => {
        if (item.name === rootname) {
          return true;
        }
      });
    });

    return await badge(func, {
      paths,
      name,
      rootname: self.root.name,
      fsId: itemFsId,
      args,
    });
  };

  const getHandle = async (data) => {
    const targetRootHandle = otherHandles.find(
      (e) => e.name === data.rootname
    ).handle;

    return data.paths.length === 0
      ? targetRootHandle
      : await targetRootHandle.get(`${data.paths.join("/")}`);
  };

  const catchError = async (func) => {
    try {
      return await func();
    } catch (err) {
      return {
        error: {
          desc: err.toString(),
          code: err.code,
        },
      };
    }
  };

  register("handle-entries", async (data) => {
    if (data.fsId === fsId) {
      return catchError(async () => {
        const handle = await getHandle(data);

        const ens = [];
        for await (let e of handle.values()) {
          ens.push({
            name: e.name,
            kind: e.kind,
          });
        }

        return ens;
      });
    }
  });

  register("handle-get", async (data) => {
    if (data.fsId === fsId) {
      return catchError(async () => {
        const handle = await getHandle(data);

        const result = await handle.get(...data.args);

        return {
          kind: result.kind,
        };
      });
    }
  });

  [
    ["read", "read"],
    ["write", "write"],
    ["remove-entry", "removeEntry"],
  ].forEach(([name, funcName]) => {
    register(`handle-${name}`, async (data) => {
      if (data.fsId === fsId) {
        return catchError(async () => {
          const handle = await getHandle(data);

          return (await handle[funcName](...data.args)) || null;
        });
      }
    });
  });

  const addRemotes = (data) => {
    const targetRemote = remotes.find((e) => e.fsId === data.fsId);

    if (!targetRemote) {
      remotes.push({
        fsId: data.fsId,
        others: data.others.map(
          (name) =>
            new RemoteDirHandle({
              paths: [],
              _name: name,
              badge: (options) => remoteBadge(options, data.fsId),
            })
        ),
      });
    } else {
      targetRemote.others = data.others.map(
        (name) =>
          new RemoteDirHandle({
            paths: [],
            _name: name,
            badge: (options) => remoteBadge(options, data.fsId),
          })
      );
    }
  };

  // 基础远端数据广播
  register("init", async (data) => {
    addRemotes(data);

    post({
      type: "re-init",
      fsId,
      others: otherHandles.map((e) => e.name),
    });
  });

  register("re-init", async (data) => {
    addRemotes(data);
  });

  register("close", async (data) => {
    const oldId = remotes.findIndex((e) => e.fsId === data.fsId);
    if (oldId > -1) {
      remotes.splice(oldId, 1);
    }
  });

  setTimeout(() => {
    post({
      type: "init",
      fsId,
      others: otherHandles.map((e) => e.name),
    });
  });

  globalThis.addEventListener("beforeunload", (event) => {
    post({
      type: "close",
      fsId,
    });
  });

  const rootHandlePms = navigator.storage.getDirectory();

  // 获取本地的 file system 数据
  const get = async (path = "", { handle, create, type } = {}) => {
    const root = new NDirHandle(handle || (await rootHandlePms));
    if (!path) {
      return root;
    }

    return await root.get(path, {
      create,
      type,
    });
  };

  const otherHandles = [];

  self.addEventListener("fetch", async (event) => {
    const { request } = event;
    const { url } = request;
    const urlObj = new URL(url);
    const { pathname } = urlObj;

    // 属于$的进入虚拟空间获取数据
    if (/^\/\$/.test(pathname)) {
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

            console.log("sw", request);

            const file = await handle.file();

            return new Response(file, {
              status: 200,
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
