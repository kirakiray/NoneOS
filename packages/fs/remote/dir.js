import { RemoteBaseHandle } from "./base.js";
import { extendDirHandle } from "../public/dir.js";
import { post } from "./public.js";
import { RemoteFileHandle } from "./file.js";

export class RemoteDirHandle extends RemoteBaseHandle {
  constructor(options) {
    super(options);
  }

  async get(name, options) {
    // 抽取handle信息
    const handleInfo = await this._post("get", [name, options]);

    if (handleInfo.kind === "dir") {
      return new RemoteDirHandle({
        userDirName: this._userDirName,
        connection: this._connection,
        path: handleInfo.path,
      });
    } else {
      return new RemoteFileHandle({
        userDirName: this._userDirName,
        connection: this._connection,
        path: handleInfo.path,
      });
    }
  }

  async length() {
    return this._post("length");
  }

  async *keys() {
    const keys = await this._post("keys", [], { gen: 1 });

    for (let key of keys) {
      yield key;
    }
  }
}

extendDirHandle(RemoteDirHandle);
