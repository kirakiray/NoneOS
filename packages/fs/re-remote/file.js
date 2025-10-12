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
    // 获取块信息后，在通过block模块进行组装内容
    const result = await agentData(this.#remoteUser, {
      name: "get-file-hash",
      path: this.path,
    });

    // 从块模块上获取文件内容
    debugger;

    // return result;
  }

  async write(...args) {
    debugger;
  }

  async lastModified() {
    return agentData(this.#remoteUser, {
      name: "lastModified",
      path: this.path,
    });
  }
}

extendFileHandle(RemoteFileHandle);
