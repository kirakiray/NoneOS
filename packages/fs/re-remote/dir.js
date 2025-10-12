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

    debugger;
  }

  async length() {}

  async *keys() {
    debugger;
  }
}

extendDirHandle(RemoteDirHandle);
