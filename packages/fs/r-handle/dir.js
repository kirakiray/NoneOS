import { RemoteBaseHandle } from "./base.js";

export class RemoteDirHandle extends RemoteBaseHandle {
  constructor(options) {
    super(options);
  }

  get kind() {
    return "dir";
  }

  async get(...args) {
    const target = await this.bridge({
      method: "get",
      path: this.path,
      args,
    });

    return target;
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

// 转发 generator 相关方法
["keys", "values", "entries", "length"].forEach((name) => {
  RemoteDirHandle.prototype[name] = async function* (...args) {
    const result = await this.bridge({
      method: name,
      path: this.path,
      args,
    });

    for await (let item of result) {
      yield item;
    }
  };
});
