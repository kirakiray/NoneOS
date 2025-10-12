import { PublicBaseHandle } from "../public/base.js";

export const agentData = async (remoteUser, options) => {
  const taskId = Math.random().toString(36).slice(2);

  return new Promise((resolve, reject) => {
    remoteUser.post({
      ...options,
      type: "fs-agent",
      taskId,
      __internal_mark: 1,
    });

    remoteUser.self.bind("receive-data", (e) => {
      const { data } = e.detail;

      if (data.type === "response-fs-agent" && data.taskId === taskId) {
        // 检查是否有错误信息
        if (data.error) {
          // 创建一个新的错误对象并抛出
          const error = new Error(data.error.message);
          error.name = data.error.name;
          error.stack = data.error.stack;
          reject(error);
        } else {
          resolve(data);
        }
      }
    });
  });
};

export class RemoteBaseHandle extends PublicBaseHandle {
  #path;

  constructor(options) {
    super(options);
    const { path } = options;
    this.#path = path;
  }

  get name() {
    return this.#path.split("/").pop();
  }

  get remoteUserId() {}

  get path() {
    return this.#path;
  }

  get parent() {
    debugger;
  }

  get root() {}

  async id() {}

  async remove() {}

  async size() {}

  async isSame(target) {}

  async observe(func) {}

  get _mark() {
    return "remote";
  }
}
