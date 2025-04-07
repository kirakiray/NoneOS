import { RemoteBaseHandle } from "./base.js";
import { extendDirHandle } from "../public/dir.js";
import { post } from "./public.js";

export class RemoteDirHandle extends RemoteBaseHandle {
  #connection;
  #name;
  #userDirName;
  constructor({ root, parent, connection, name, userDirName }) {
    super({ root, parent });
    this.#connection = connection;
    this.#name = name;
    this.#userDirName = userDirName;
  }

  async get(path) {
    debugger;
  }

  async length() {
    return post({
      userDirName: this.#userDirName,
      connection: this.#connection,
      data: {
        method: "length",
        path: this.path,
        args: [],
      },
    });
  }

  async *keys() {
    for await (let key of this._handle.keys()) {
      yield key;
    }
  }

  get name() {
    return this.#name;
  }
}

extendDirHandle(RemoteDirHandle);
