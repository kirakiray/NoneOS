import { RemoteBaseHandle } from "./base.js";
import { extendDirHandle } from "../public/dir.js";
import { RemoteFileHandle } from "./file.js";

export class RemoteDirHandle extends RemoteBaseHandle {
  constructor(options) {
    super(options);
  }

  async get(...args) {
    debugger;
  }

  async length() {}

  async *keys() {
    debugger;
  }
}

extendDirHandle(RemoteDirHandle);
