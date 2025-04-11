import { BaseHandle } from "./base.js";
import { notify } from "../public/base.js";
import { extendFileHandle } from "../public/file.js";

export class FileHandle extends BaseHandle {
  constructor(...args) {
    super(...args);
  }

  // 读取文件
  async read(options = {}) {
    // options = {
    //   type: "text",
    //   start: "",
    //   end: "",
    // };

    let file = await this._handle.getFile();
    if (options.start || options.end) {
      file = file.slice(options.start, options.end);
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
  }

  async write(data, options = {}) {
    const handle = this._handle;
    const steam = await handle.createWritable();
    await steam.write(data);
    await steam.close();

    notify({
      path: this.path,
      type: "write",
      data,
      remark: options.remark,
    });
  }
}

extendFileHandle(FileHandle);
