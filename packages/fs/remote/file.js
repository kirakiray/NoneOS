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
      const chunkSize = 128 * 1024;
      const start = options.start
        ? Math.floor(options.start / chunkSize) * chunkSize
        : 0;

      file = await this._post("file", [
        {
          start,
          end: options.end,
        },
      ]);

      // 裁剪前面的部份
      if (options.start) {
        file = file.slice(options.start - start);
      }
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
