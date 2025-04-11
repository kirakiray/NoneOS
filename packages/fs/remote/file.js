import { RemoteBaseHandle } from "./base.js";
import { extendFileHandle } from "../public/file.js";

export class RemoteFileHandle extends RemoteBaseHandle {
  constructor(options) {
    super(options);
  }

  // 读取文件
  async read(...args) {
    // TODO: 如果的fs的 read text，应该优化成获取 file 后，进行二次转换
    return this._post("read", args);
  }

  async write(...args) {
    return this._post("write", args);
  }
}

extendFileHandle(RemoteFileHandle);
