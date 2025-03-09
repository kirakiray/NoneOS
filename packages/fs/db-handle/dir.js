// 导入 FileDBHandle 类
import { FileDBHandle } from "./file.js";
import { BaseDBHandle } from "./base.js";

// 目录句柄类
export class DirDBHandle extends BaseDBHandle {
  constructor(...args) {
    super(...args);
  }

  // 获取或创建子文件/目录
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

    const tx = this._db.transaction(["files", "directories"], "readwrite");
    const filesStore = tx.objectStore("files");
    const dirsStore = tx.objectStore("directories");

    // 先尝试获取文件，再尝试获取目录
    let entry = await filesStore.get(this.path + "/" + name).catch(() => null);
    let isFile = true;
    if (!entry) {
      entry = await dirsStore.get(this.path + "/" + name).catch(() => null);
      isFile = false;
    }

    if (!create && !entry) {
      return null;
    }

    if (entry) {
      // 如果存在，检查类型是否匹配
      if (create === "file" && !isFile) {
        throw new Error(`${name} is not a file`);
      } else if (create === "dir" && isFile) {
        throw new Error(`${name} is not a directory`);
      }
    } else {
      // 不存在则创建
      const newPath = this.path + "/" + name;
      if (create === "file") {
        await filesStore.put({
          path: newPath,
          content: "",
          lastModified: Date.now(),
        });
      } else {
        await dirsStore.put({
          path: newPath,
          created: Date.now(),
        });
      }
    }

    // 根据类型返回相应的句柄
    const HandleClass = isFile ? FileDBHandle : DirDBHandle;
    return new HandleClass(name, {
      parent: this,
      root: await this.root(),
      db: this._db,
    });
  }

  get kind() {
    return "dir";
  }

  // 获取子项数量
  async length() {
    const tx = this._db.transaction(["files", "directories"], "readonly");
    const filesStore = tx.objectStore("files");
    const dirsStore = tx.objectStore("directories");

    const range = IDBKeyRange.bound(this.path + "/", this.path + "/\uffff");
    const [fileCount, dirCount] = await Promise.all([
      filesStore.count(range),
      dirsStore.count(range),
    ]);

    return fileCount + dirCount;
  }

  // 遍历子项名称
  async *keys() {
    const tx = this._db.transaction(["files", "directories"], "readonly");
    const filesStore = tx.objectStore("files");
    const dirsStore = tx.objectStore("directories");

    const range = IDBKeyRange.bound(this.path + "/", this.path + "/\uffff");

    // 遍历文件
    const filesCursor = await filesStore.openCursor(range);
    while (filesCursor) {
      const name = filesCursor.value.path.split("/").pop();
      yield name;
      await filesCursor.continue();
    }

    // 遍历目录
    const dirsCursor = await dirsStore.openCursor(range);
    while (dirsCursor) {
      const name = dirsCursor.value.path.split("/").pop();
      yield name;
      await dirsCursor.continue();
    }
  }

  // 遍历子项
  async *entries() {
    for await (const key of this.keys()) {
      const handle = await this.get(key);
      yield [key, handle];
    }
  }

  // 遍历子项句柄
  async *values() {
    for await (const [key, value] of this.entries()) {
      yield value;
    }
  }

  // 遍历子项直到回调返回 true
  async some(callback) {
    for await (const [key, value] of this.entries()) {
      if (await callback(value, key, this)) {
        break;
      }
    }
  }

  // 扁平化获取所有子文件
  async flat() {
    const result = [];
    for await (const [name, handle] of this.entries()) {
      if (handle.kind !== "dir") {
        result.push(handle);
      } else {
        const children = await handle.flat();
        result.push(...children);
      }
    }
    return result;
  }
}
