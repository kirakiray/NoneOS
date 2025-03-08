import { BaseHandle } from "./base.js";
import { FileHandle } from "./file.js";

export class DirHandle extends BaseHandle {
  constructor(...args) {
    super(...args);
  }

  async get(name, options) {
    const { create } = options || {};

    // 多重路径进行递归
    if (name.includes("/")) {
      const names = name.split("/");
      let handle = this;
      while (names.length) {
        const name = names.shift();
        let innerCreate;
        if (create) {
          if (names.length) {
            innerCreate = "dir";
          } else {
            innerCreate = create;
          }
        }
        handle = await handle.get(name, {
          create: innerCreate,
        });
      }

      return handle;
    }

    // 先尝试获取文件，在尝试获取目录，看有没有同名的文件
    let beforeOriHandle = await this.handle
      .getFileHandle(name)
      .catch(() => null);
    if (!beforeOriHandle) {
      beforeOriHandle = await this.handle
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

      beforeOriHandle = await this.handle[funcName](name, {
        create: true,
      });
    }

    // 根据handle类型返回
    if (beforeOriHandle.kind === "file") {
      return new FileHandle(beforeOriHandle, {
        parentPath: this.path,
        parent: this,
        root: (await this.root()) || this,
      });
    } else if (beforeOriHandle.kind === "directory") {
      return new DirHandle(beforeOriHandle, {
        parentPath: this.path,
        parent: this,
        root: (await this.root()) || this,
      });
    }

    return null;
  }

  get kind() {
    return "dir";
  }

  // 获取子文件数量
  async length() {
    let count = 0;
    // 遍历目录下所有文件和文件夹
    for await (const [name, handle] of this.handle.entries()) {
      count++;
    }
    return count;
  }

  async *keys() {
    for await (let key of this.handle.keys()) {
      yield key;
    }
  }

  async *entries() {
    for await (let key of this.keys()) {
      const handle = await this.get(key);
      yield [key, handle];
    }
  }

  async *values() {
    for await (let [key, value] of this.entries()) {
      yield value;
    }
  }

  async some(callback) {
    // 遍历目录，如果回调返回true则提前退出
    for await (let [key, value] of this.entries()) {
      if (await callback(value, key, this)) {
        break;
      }
    }
  }

  // 扁平化获取所有的子文件（包括多级子孙代）
  async flat() {}
}
