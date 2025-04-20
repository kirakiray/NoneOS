import { PublicBaseHandle } from "../public/base.js";
import { post } from "./public.js";
import { RemoteDirHandle } from "./dir.js";

export class RemoteBaseHandle extends PublicBaseHandle {
  #path;
  #connection;
  #userDirName;
  #remoteUserId;
  constructor({ path, connection, userDirName, remoteUserId }) {
    super({});
    this.#path = path;
    this.#connection = connection;
    this.#userDirName = userDirName;
    this.#remoteUserId = remoteUserId;
  }

  get name() {
    return this.#path.split("/").pop();
  }

  get remoteUserId() {
    return this.#remoteUserId;
  }

  get path() {
    if (this.#remoteUserId) {
      return `$user-${this.#remoteUserId}:${this.#path}`;
    }

    return this.#path;
  }

  get parent() {
    return new RemoteDirHandle({
      path: this.#path.split("/").slice(0, -1).join("/"),
      connection: this.#connection,
      userDirName: this.#userDirName,
    });
  }

  get root() {
    return new RemoteDirHandle({
      path: this.#path.split("/")[0],
      connection: this.#connection,
      userDirName: this.#userDirName,
    });
  }

  get _userDirName() {
    return this.#userDirName;
  }

  get _connection() {
    return this.#connection;
  }

  // 添加通用的 post 方法
  async _post(method, args = [], options = {}) {
    try {
      return await post({
        userDirName: this._userDirName,
        connection: this._connection,
        data: {
          method,
          path: this.#path,
          args,
          ...options,
        },
      });
    } catch (error) {
      console.error(`Error in ${method} operation:`, error);
      throw error;
    }
  }

  async id() {
    return this._post("id");
  }

  async remove() {
    return this._post("remove");
  }

  async size() {
    return this._post("size");
  }

  async isSame(target) {
    return this.path === target.path;
    // return (
    //   this.#connection === target._connection && this.#path === target.path
    // );
  }

  observe() {
    // 实现基本的观察功能，而不是抛出错误
    return this._post("observe");
  }
}
