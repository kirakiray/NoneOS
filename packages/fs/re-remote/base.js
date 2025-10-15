import { PublicBaseHandle } from "../public/base.js";
import { getHash } from "../../fs/util.js";
import { observePool, agentData } from "./public.js";

// import { RemoteDirHandle } from "./dir.js";

let RemoteDirHandle = null;
import("./dir.js").then((module) => {
  RemoteDirHandle = module.RemoteDirHandle;
});

export class RemoteBaseHandle extends PublicBaseHandle {
  #path;
  #remoteUser;

  constructor(options) {
    super(options);
    const { path } = options;
    this.#path = path;
    this.#remoteUser = options.remoteUser;
  }

  get name() {
    return this.#path.split("/").pop();
  }

  get path() {
    return `$user-${this.#remoteUser.userId}:${this.#path}`;
  }

  get _path() {
    return this.#path;
  }

  get parent() {
    const pathArr = this.#path.split("/");

    if (pathArr.length === 1) {
      return null;
    }

    return new RemoteDirHandle({
      remoteUser: this.#remoteUser,
      path: pathArr.slice(0, -1).join("/"),
    });
  }

  get root() {
    const pathArr = this.#path.split("/");

    return new RemoteDirHandle({
      remoteUser: this.#remoteUser,
      path: pathArr[0],
    });
  }

  async id() {
    return await getHash(this.path);
  }

  async remove() {
    return await agentData(this.#remoteUser, {
      name: "remove",
      path: this._path,
    });
  }

  async isSame(target) {
    return (await this.id()) === (await target.id());
  }

  // 监听文件或目录是否被修改
  async observe(func) {
    const obsId = Math.random().toString(36).slice(2);

    await agentData(this.#remoteUser, {
      name: "observe",
      path: this._path,
      obsId,
    });

    observePool.set(obsId, func);

    return async () => {
      await agentData(this.#remoteUser, {
        name: "cancel-observe",
        path: this._path,
        obsId,
      });

      observePool.delete(obsId);
    };
  }

  get _mark() {
    return "remote";
  }

  async size() {
    return await agentData(this.#remoteUser, {
      name: "size",
      path: this._path,
    });
  }
}
