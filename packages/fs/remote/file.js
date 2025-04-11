import { RemoteBaseHandle } from "./base.js";
import { extendFileHandle } from "../public/file.js";

export class RemoteFileHandle extends RemoteBaseHandle {
  constructor(options) {
    super(options);
  }

  // 读取文件
  async read(options) {
    let file;
    if (!options.start && !options.end) {
      // 统一使用file读取，因为性能更好，获取file后在转换操作
      file = await this._post("file", []);
    } else {
      // TODO: 如果是通过范围读取，按照128kb块来获取数据后，再裁剪首尾部分
      debugger;
      file = await this._post("file", [options]);
    }

    switch (options.type) {
      case "file":
        return file;
      case "buffer":
        return file.arrayBuffer();
      case "text":
      default:
        return file.text();
    }

    // return this._post("read", [options]);
  }

  async write(...args) {
    return this._post("write", args);
  }
}

extendFileHandle(RemoteFileHandle);
