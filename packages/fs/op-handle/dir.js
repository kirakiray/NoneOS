import { OriginBaseHandle, KIND } from "./base.js";
import { OriginFileHandle } from "./file.js";
import { getErr } from "../errors.js";

/**
 * 创建文件夹handle
 * @extends {OriginBaseHandle}
 */
export class OriginDirHandle extends OriginBaseHandle {
  /**
   * 创建一个文件句柄实例
   * @param {FileSystemDirectoryHandle} systemHandle
   */
  constructor(systemHandle, path) {
    super(systemHandle, path);
    this[KIND] = "dir";
  }

  /**
   * 获取子文件或目录的handle
   * @param {string} path - 获取的子文件或目录的路径
   * @param {Object} options - 获取选项的选项
   * @returns  {Promise<(OriginFileHandle|OriginDirHandle)>}
   */
  async get(path, options = {}) {
    if (
      options &&
      options.create &&
      options.create !== "file" &&
      options.create !== "dir"
    ) {
      throw getErr("invalidCreateType");
    }

    const paths = path.split("/");
    let self = this;

    if (paths.length > 1) {
      // 如果路径中包含多个路径，则递归获取到最后一个路径的父目录
      // 如果带有 create 参数，则递归创建目录
      for (const memberName of paths.slice(0, -1)) {
        let prevDirHandle = self;
        self = await self.get(memberName, {
          create: options?.create ? "dir" : undefined,
        });
        if (!self) {
          throw getErr("pathNotFound", {
            path: prevDirHandle.path + "/" + memberName,
          });
        }
      }
    }

    let isFile = true;

    // 最后一级子文件或目录名
    let subName = paths.slice(-1)[0];

    let oriHandle;
    if (options.create) {
      // 优先通过 create 规则获取handle
      if (options.create === "file") {
        oriHandle = await self._sh.getFileHandle(subName, {
          create: true,
        });
      } else {
        oriHandle = await self._sh.getDirectoryHandle(subName, {
          create: true,
        });
        isFile = false;
      }
    } else {
      try {
        oriHandle = await self._sh.getFileHandle(subName);
      } catch (err) {
        try {
          oriHandle = await self._sh.getDirectoryHandle(subName);
          isFile = false;
        } catch (err2) {}
      }
    }

    if (oriHandle) {
      if (isFile) {
        return new OriginFileHandle(
          oriHandle,
          `${self.path}/${oriHandle.name}`
        );
      } else {
        return new OriginDirHandle(oriHandle, `${self.path}/${oriHandle.name}`);
      }
    }

    return null;
  }

  /**
   * 异步生成器函数，返回子数据的名称。
   * @async
   * @generator
   * @yields {string} 子数据的名称。
   */
  async *keys() {
    for await (let key of this._sh.keys()) {
      yield key;
    }
  }

  /**
   * 异步生成器函数，返回子数据的名称和对应的句柄。
   * @async
   * @generator
   * @yields {Array} 包含子数据名称和句柄的数组。
   */
  async *entries() {
    for await (let item of this._sh.values()) {
      if (item.kind === "file") {
        yield [
          item.name,
          new OriginFileHandle(item, `${this.path}/${item.name}`),
        ];
      } else {
        yield [
          item.name,
          new OriginDirHandle(item, `${this.path}/${item.name}`),
        ];
      }
    }
  }

  /**
   * 异步生成器函数，返回子数据的句柄。
   * @async
   * @generator
   * @yields {(OriginDirHandle|OriginFileHandle)} 子数据的句柄。
   */
  async *values() {
    for await (let item of this._sh.values()) {
      if (item.kind === "file") {
        yield new OriginFileHandle(item, `${this.path}/${item.name}`);
      } else {
        yield new OriginDirHandle(item, `${this.path}/${item.name}`);
      }
    }
  }

  /**
   * 异步函数，对每个子数据执行回调函数。
   * @async
   * @param {Function} callback - 对每个子数据执行的回调函数，接收句柄和索引作为参数。
   */
  async forEach(callback) {
    for await (let item of this.values()) {
      await callback(item);
    }
  }

  async length() {
    return await this._sh.count();
  }
}
