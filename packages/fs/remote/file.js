import { RemoteBaseHandle } from "./base.js";
import { extendFileHandle } from "../public/file.js";

export class RemoteFileHandle extends RemoteBaseHandle {
  constructor(options) {
    super(options);
  }

  // 读取文件
  async read(...args) {
    return this._post("read", args);
  }

  async write(...args) {
    return this._post("write", args);
  }
}

extendFileHandle(RemoteFileHandle);
