import { RemoteBaseHandle } from "./base.js";

export class RemoteDirHandle extends RemoteBaseHandle {
  constructor(path, bridgeFunc) {
    super(path, bridgeFunc);
  }
  /**
   * 获取子文件或目录的handle
   * @param {string} path - 获取的子文件或目录的路径
   * @param {Object} options - 获取选项的选项
   * @returns  {Promise<(OriginFileHandle|OriginDirHandle)>}
   */
  async get() {}

  /**
   * 异步生成器函数，返回子数据的名称。
   * @async
   * @generator
   * @yields {string} 子数据的名称。
   */
  async *keys() {}

  /**
   * 异步生成器函数，返回子数据的名称和对应的句柄。
   * @async
   * @generator
   * @yields {Array} 包含子数据名称和句柄的数组。
   */
  async *entries() {}

  /**
   * 异步生成器函数，返回子数据的句柄。
   * @async
   * @generator
   * @yields {(OriginDirHandle|OriginFileHandle)} 子数据的句柄。
   */
  async *values() {}

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
    let count = 0;
    for await (let key of this.keys()) {
      count++;
    }

    return count;
  }
}
