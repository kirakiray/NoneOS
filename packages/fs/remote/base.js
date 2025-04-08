import { PublicBaseHandle } from "../public/base.js";
import { post } from "./public.js";
import { RemoteDirHandle } from "./dir.js";

export class RemoteBaseHandle extends PublicBaseHandle {
  #path;
  #connection;
  #userDirName;
  constructor({ path, connection, userDirName }) {
    super({});
    this.#path = path;
    this.#connection = connection;
    this.#userDirName = userDirName;
  }

  get name() {
    return this.#path.split("/").pop();
  }

  get path() {
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

  async id() {
    return post({
      userDirName: this._userDirName,
      connection: this._connection,
      data: {
        method: "id",
        path: this.path,
        args: [],
      },
    });
  }

  async isSame(target) {
    return this._connection === target._connection && this.path === target.path;
  }

  async remove() {
    return post({
      userDirName: this._userDirName,
      connection: this._connection,
      data: {
        method: "remove",
        path: this.path,
        args: [],
      },
    });
  }

  observe() {
    throw new Error("Method not implemented.");
  }
}
