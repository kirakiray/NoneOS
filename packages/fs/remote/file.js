import { RemoteBaseHandle } from "./base.js";
import { extendFileHandle } from "../public/file.js";

export class RemoteFileHandle extends RemoteBaseHandle {
  constructor(options) {
    super(options);
  }

  // 读取文件
  async read(options = {}) {
    return this._post("read", [options]);
  }

  async write(data, options) {
    return this._post("write", [data, options]);
  }
}

extendFileHandle(RemoteFileHandle);
