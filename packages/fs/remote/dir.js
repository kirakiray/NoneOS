import { RemoteBaseHandle } from "./base.js";
import { extendDirHandle } from "../public/dir.js";
import { post } from "./public.js";
import { RemoteFileHandle } from "./file.js";

export class RemoteDirHandle extends RemoteBaseHandle {
  constructor(...args) {
    super(...args);
  }

  async get(name, options) {
    // 抽取handle信息
    const handleInfo = await post({
      userDirName: this._userDirName,
      connection: this._connection,
      data: {
        method: "get",
        path: this.path,
        args: [name, options],
      },
    });

    if (handleInfo.kind === "dir") {
      return new RemoteDirHandle({
        userDirName: this._userDirName,
        connection: this._connection,
        name: handleInfo.name,
      });
    } else {
      return new RemoteFileHandle({
        userDirName: this._userDirName,
        connection: this._connection,
        name: handleInfo.name,
      });
    }
  }

  async length() {
    return post({
      userDirName: this._userDirName,
      connection: this._connection,
      data: {
        method: "length",
        path: this.path,
        args: [],
      },
    });
  }

  async *keys() {
    const keys = await post({
      userDirName: this._userDirName,
      connection: this._connection,
      data: {
        method: "keys",
        path: this.path,
        gen: 1,
        args: [],
      },
    });

    for (let key of keys) {
      yield key;
    }
  }
}

extendDirHandle(RemoteDirHandle);

const createParents = ({ userDirName, connection }) => {};
