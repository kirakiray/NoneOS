import { BaseCacheHandle } from "./base.js";
import { notify } from "../public/base.js";
import { extendFileHandle } from "../public/file.js";

export class FileCacheHandle extends BaseCacheHandle {
  constructor(...args) {
    super(...args);
  }

  async read(options = {}) {
    debugger;
  }

  async write(data, options = {}) {
    debugger;
  }
}

extendFileHandle(FileCacheHandle);
