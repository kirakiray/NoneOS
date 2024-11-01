import { RemoteBaseHandle } from "./base.js";

export class RemoteDirHandle extends RemoteBaseHandle {
  constructor(options) {
    super(options);
  }

  get kind() {
    return "dir";
  }

  async get(name) {
    debugger;
  }

  /**
   * 异步生成器函数，返回子数据的句柄。
   * @async
   * @generator
   * @yields {(OriginDirHandle|OriginFileHandle)} 子数据的句柄。
   */
  async *values() {
    const result = await this.bridge({
      method: "values",
      path: this.path,
    });

    for await (let item of result) {
      yield item;
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
}
