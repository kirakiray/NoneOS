import { PublicBaseHandle } from "../public/base.js";
import { post } from "./public.js";
import { RemoteDirHandle } from "./dir.js";

export class RemoteBaseHandle extends PublicBaseHandle {
  #path;
  #connection;
  #useLocalUserDirName;
  #remoteUserId;
  constructor({ path, connection, useLocalUserDirName, remoteUserId }) {
    super({});
    this.#path = path;
    this.#connection = connection;
    this.#useLocalUserDirName = useLocalUserDirName;
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
      useLocalUserDirName: this.#useLocalUserDirName,
    });
  }

  get root() {
    return new RemoteDirHandle({
      path: this.#path.split("/")[0],
      connection: this.#connection,
      useLocalUserDirName: this.#useLocalUserDirName,
    });
  }

  get _useLocalUserDirName() {
    return this.#useLocalUserDirName;
  }

  get _connection() {
    return this.#connection;
  }

  // 添加通用的 post 方法
  async _post(method, args = [], options = {}) {
    try {
      return await post({
        useLocalUserDirName: this._useLocalUserDirName,
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
  }

  async observe(func) {
    const item = {
      path: this.#path,
      finnalPath: this.path,
      func,
      itemId: Math.random().toString(36).slice(2),
    };

    const result = await post({
      useLocalUserDirName: this._useLocalUserDirName,
      connection: this._connection,
      data: {
        kind: "obs-fs",
        path: this.#path,
        itemId: item.itemId,
      },
    });

    if (result !== true) {
      const error = new Error(`observe failed: ` + result);
      console.warn(error, this);
      throw error;
    }

    localRemoteObsPool.set(item.itemId, item);

    return () => {
      localRemoteObsPool.delete(item.itemId);

      // 取消观察
      return post({
        useLocalUserDirName: this._useLocalUserDirName,
        connection: this._connection,
        data: {
          kind: "un-obs-fs",
          path: this.#path,
          itemId: item.itemId,
        },
      });
    };
  }
}

// 本地观察池
export const localRemoteObsPool = new Map();
