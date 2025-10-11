import { RemoteBaseHandle } from "./base.js";
import { extendFileHandle } from "../public/file.js";

export class RemoteFileHandle extends RemoteBaseHandle {
  constructor(options) {
    super(options);
  }

  // 读取文件
  async read(options) {
    debugger;
  }

  async write(...args) {}

  async lastModified() {}
}

extendFileHandle(RemoteFileHandle);
