import { RemoteBaseHandle, agentData } from "./base.js";
import { extendFileHandle } from "../public/file.js";
import { getChunk } from "../../chunk/main.js";

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

    const chunkOptions = {
      remoteUser: this.#remoteUser,
      chunkSize: result.chunkSize,
      path: this.path,
    };

    const { hashes } = result;

    const chunks = [];

    // 从块模块上获取文件内容
    for (let i = 0; i < hashes.length; i++) {
      const hash = hashes[i];
      const { chunk } = await getChunk({ hash, index: i, ...chunkOptions });
      chunks.push(chunk);
    }

    const fileName = this.path.split("/").pop();

    const file = new File(chunks, fileName, {
      type: result.type,
      lastModified: result.lastModified,
    });

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
