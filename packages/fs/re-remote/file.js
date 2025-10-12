import { RemoteBaseHandle, agentData } from "./base.js";
import { extendFileHandle } from "../public/file.js";

export class RemoteFileHandle extends RemoteBaseHandle {
  #remoteUser;

  constructor(options) {
    super(options);
    this.#remoteUser = options.remoteUser;
  }

  // 读取文件
  async read(options) {
    const result = await agentData(this.#remoteUser, {
      name: "read",
      path: this.path,
      args: [options],
    });

    return result;
  }

  async write(...args) {
    debugger;
  }

  async lastModified() {}
}

extendFileHandle(RemoteFileHandle);
