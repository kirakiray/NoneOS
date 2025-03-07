import { BaseHandle } from "./base.js";
import { FileHandle } from "./file.js";

export class DirHandle extends BaseHandle {
  constructor(...args) {
    super(...args);
  }

  async get(name, options) {
    const { create } = options || {};

    // 先尝试获取文件，在尝试获取目录，看有没有同名的文件
    let beforeHandle = await this.handle.getFileHandle(name);
    if (!beforeHandle) {
      beforeHandle = await this.handle.getDirectoryHandle(name);
    }

    if (!create && !beforeHandle) {
      //   throw new Error(`${name} is not exist`);
      // 找不到文件或文件夹，返回null
      return null;
    }

    if (beforeHandle) {
      // 如果存在文件，看是否与 create 参数冲突
      if (create === "file" && beforeHandle.kind !== "file") {
        throw new Error(`${name} is not a file`);
      } else if (create === "dir" && beforeHandle.kind !== "directory") {
        throw new Error(`${name} is not a directory`);
      }
    } else {
      // 不存在的话，进行创建
      // 根据方式获取参数
      let funcName = "getDirectoryHandle";
      if (options.create === "file") {
        funcName = "getFileHandle";
      }

      beforeHandle = await this.handle[funcName](name, {
        create: true,
      });
    }

    // 根据handle类型返回
    if (beforeHandle.kind === "file") {
      return new FileHandle(beforeHandle);
    } else if (beforeHandle.kind === "dir") {
      return new DirHandle(beforeHandle);
    }

    // 不应该存在的情况会到这里
    debugger;
  }

  remove() {}
}
