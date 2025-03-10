import { BaseHandle } from "./base.js";
import { FileHandle } from "./file.js";
import { extendDirHandle } from "../public/dir.js";

export class DirHandle extends BaseHandle {
  constructor(...args) {
    super(...args);
  }

  async get(name, options) {
    const { create } = options || {};

    if (name.includes("/")) {
      return await this._getByMultiPath(name, options);
    }

    // 先尝试获取文件，在尝试获取目录，看有没有同名的文件
    let beforeOriHandle = await this._handle
      .getFileHandle(name)
      .catch(() => null);
    if (!beforeOriHandle) {
      beforeOriHandle = await this._handle
        .getDirectoryHandle(name)
        .catch(() => null);
    }

    if (!create && !beforeOriHandle) {
      //   throw new Error(`${name} is not exist`);
      // 找不到文件或文件夹，返回null
      return null;
    }

    if (beforeOriHandle) {
      // 如果存在文件，看是否与 create 参数冲突
      if (create === "file" && beforeOriHandle.kind !== "file") {
        throw new Error(`${name} is not a file`);
      } else if (create === "dir" && beforeOriHandle.kind !== "directory") {
        throw new Error(`${name} is not a directory`);
      }
    } else {
      // 不存在的话，进行创建
      // 根据方式获取参数
      let funcName = "getDirectoryHandle";
      if (options.create === "file") {
        funcName = "getFileHandle";
      }

      beforeOriHandle = await this._handle[funcName](name, {
        create: true,
      });
    }

    // 根据handle类型返回
    if (beforeOriHandle.kind === "file") {
      return new FileHandle(beforeOriHandle, {
        parent: this,
        root: this.root || this,
      });
    } else if (beforeOriHandle.kind === "directory") {
      return new DirHandle(beforeOriHandle, {
        parent: this,
        root: this.root || this,
      });
    }

    return null;
  }

  // 获取子文件数量
  async length() {
    let count = 0;
    // 遍历目录下所有文件和文件夹
    for await (const [name, handle] of this._handle.entries()) {
      count++;
    }
    return count;
  }

  async *keys() {
    for await (let key of this._handle.keys()) {
      yield key;
    }
  }
}

extendDirHandle(DirHandle);
