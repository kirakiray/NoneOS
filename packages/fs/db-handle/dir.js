import { BaseDBHandle } from "./base.js";

export class DirDBHandle extends BaseDBHandle {
  constructor() {
    super();
  }
  async get(name, options) {
    const { create } = options;
    const children = await this.children();
    const child = children.find((child) => child.name === name);
    if (child) {
      return child;
    }
    if (create === "dir") {
      return await this.createDir(name);
    }
    if (create === "file") {
      return await this.createFile(name);
    }
    throw new Error("not found");
  }
}
