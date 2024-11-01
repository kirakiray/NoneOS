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

  async size() {
    if (this.kind === "dir") {
      return;
    }

    return 100;
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
