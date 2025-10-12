import { RemoteBaseHandle } from "./base.js";
import { extendDirHandle } from "../public/dir.js";
import { RemoteFileHandle } from "./file.js";

export class RemoteDirHandle extends RemoteBaseHandle {
  #remoteUser;
  constructor(options) {
    super(options);
    this.#remoteUser = options.remoteUser;
  }

  async get(...args) {
    this.#remoteUser.post({
      type: "fs-agent",
      name: "get",
      path: this.path,
      args,
    });
  }

  async length() {}

  async *keys() {
    debugger;
  }
}

extendDirHandle(RemoteDirHandle);
