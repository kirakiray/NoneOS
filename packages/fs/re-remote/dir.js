import { RemoteBaseHandle, agentData } from "./base.js";
import { extendDirHandle } from "../public/dir.js";
import { RemoteFileHandle } from "./file.js";

export class RemoteDirHandle extends RemoteBaseHandle {
  #remoteUser;
  constructor(options) {
    super(options);
    this.#remoteUser = options.remoteUser;
  }

  async get(...args) {
    const result = await agentData(this.#remoteUser, {
      name: "get",
      path: this.path,
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
      path: this.path,
    });
  }

  async *keys() {
    const keys = await agentData(this.#remoteUser, {
      name: "keys",
      path: this.path,
    });

    for (let key of keys) {
      yield key;
    }
  }
}

extendDirHandle(RemoteDirHandle);
