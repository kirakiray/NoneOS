import { PublicBaseHandle } from "../base-handle.js";

export class RemoteBaseHandle {
  #path;
  #createTime;
  #lastModified;
  constructor(options) {
    const { path, bridge, info } = options;
    this.#path = path;
    Object.defineProperties(this, {
      bridge: {
        value: bridge,
      },
    });

    if (info) {
      const { createTime, lastModified } = info;
      this.#createTime = createTime;
      this.#lastModified = lastModified;
    }
  }

  get path() {
    return this.#path;
  }

  get createTime() {
    return this.#createTime;
  }

  get lastModified() {
    return this.#lastModified;
  }

  get name() {
    const arr = this.#path.split("/");
    if (arr.length > 1) {
      return arr.slice(-1)[0];
    }

    return this.#path.split(":").slice(-1)[0];
  }

  async size(...args) {
    if (this.kind === "dir") {
      return;
    }

    return this.bridge({
      method: "size",
      path: this.path,
      args,
    });
  }

  async remove(...args) {
    return this.bridge({
      method: "remove",
      path: this.path,
      args,
    });
  }

  async root() {
    debugger;
  }

  // 刷新信息
  refresh() {
    // 基本已经刷新
  }

  get _mark() {
    return "remote";
  }
}

// 转发所有方法
Object.keys(
  Object.getOwnPropertyDescriptors(PublicBaseHandle.prototype)
).forEach((name) => {
  if (name !== "constructor") {
    RemoteBaseHandle.prototype[name] = function (...args) {
      return this.bridge({
        method: name,
        path: this.path,
        args,
      });
    };
  }
});
