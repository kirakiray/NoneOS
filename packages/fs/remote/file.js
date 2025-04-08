import { RemoteBaseHandle } from "./base.js";
import { extendFileHandle } from "../public/file.js";

export class RemoteFileHandle extends RemoteBaseHandle {
  constructor(...args) {
    super(...args);
  }

  // 读取文件
  async read(options = {}) {
    return post({
      userDirName: this._userDirName,
      connection: this._connection,
      data: {
        method: "read",
        path: this.path,
        args: [options],
      },
    });
  }

  async write(data, options) {
    return post({
      userDirName: this._userDirName,
      connection: this._connection,
      data: {
        method: "write",
        path: this.path,
        args: [data, options],
      },
    });
  }
}

extendFileHandle(RemoteFileHandle);
