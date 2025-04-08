import { RemoteBaseHandle } from "./base.js";
import { extendFileHandle } from "../public/file.js";

export class RemoteFileHandle extends RemoteBaseHandle {
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
  }

  async write(data, options = {}) {}
}

extendFileHandle(RemoteFileHandle);
