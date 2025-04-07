import { RemoteBaseHandle } from "./base.js";
import { extendDirHandle } from "../public/dir.js";

export class RemoteDirHandle extends RemoteBaseHandle {
  #connection;
  #name;
  constructor({ root, parent, connection, name }) {
    super({ root, parent });
    this.#connection = connection;
    this.#name = name;
  }

  async get(path) {
    debugger;
  }

  async length() {
    const result = await this.#connection.send({
      method: "length",
      path: this.path,
    });

    debugger;
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
