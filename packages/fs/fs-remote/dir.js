import { RemoteBaseHandle } from "./base.js";
import { extendDirHandle } from "../public/dir.js";
import { RemoteFileHandle } from "./file.js";
import { agentData } from "./public.js";

export class RemoteDirHandle extends RemoteBaseHandle {
  #remoteUser;
  constructor(options) {
    super(options);
    this.#remoteUser = options.remoteUser;
  }

  async get(...args) {
    const result = await agentData(this.#remoteUser, {
      name: "get",
      path: this._path,
      args,
    });

    if (!result) {
      return result;
    }

    if (result.kind === "file") {
      return new RemoteFileHandle({
        remoteUser: this.#remoteUser,
        path: result.path,
      });
    } else if (result.kind === "dir") {
      return new RemoteDirHandle({
        remoteUser: this.#remoteUser,
        path: result.path,
      });
    }
  }

  async length() {
    return agentData(this.#remoteUser, {
      name: "length",
      path: this._path,
    });
  }

  async *keys() {
    const keys = await agentData(this.#remoteUser, {
      name: "keys",
      path: this._path,
    });

    for (let key of keys) {
      yield key;
    }
  }
}

extendDirHandle(RemoteDirHandle);
