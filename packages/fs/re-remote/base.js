import { PublicBaseHandle } from "../public/base.js";
import { RemoteDirHandle } from "./dir.js";
import { getHash } from "../../fs/util.js";

export class RemoteBaseHandle extends PublicBaseHandle {
  #path;
  #remoteUser;

  constructor(options) {
    super(options);
    const { path } = options;
    this.#path = path;
    this.#remoteUser = options.remoteUser;
  }

  get name() {
    return this.#path.split("/").pop();
  }

  get path() {
    return `$user-${this.#remoteUser.userId}:${this.#path}`;
  }

  get _path() {
    return this.#path;
  }

  get parent() {
    const pathArr = this.#path.split("/");

    if (pathArr.length === 1) {
      return null;
    }

    return new RemoteDirHandle({
      remoteUser: this.#remoteUser,
      path: pathArr.slice(0, -1).join("/"),
    });
  }

  get root() {
    const pathArr = this.#path.split("/");

    return new RemoteDirHandle({
      remoteUser: this.#remoteUser,
      path: pathArr[0],
    });
  }

  async id() {
    return await getHash(this.path);
  }

  async remove() {}

  async size() {}

  async isSame(target) {
    return (await this.id()) === (await target.id());
  }

  async observe(func) {}

  get _mark() {
    return "remote";
  }
}

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
      const { data, options } = e.detail;

      let finalData = data;

      if (data instanceof Uint8Array && options._type) {
        finalData = {
          ...options,
          result: data,
        };
      }

      if (
        finalData._type === "response-fs-agent" &&
        finalData.taskId === taskId
      ) {
        // 检查是否有错误信息
        if (finalData.error) {
          // 创建一个新的错误对象并抛出
          const error = new Error(finalData.error.message);
          error.name = finalData.error.name;
          error.stack = finalData.error.stack;
          reject(error);
        } else {
          resolve(finalData.result);
        }
      }
    });
  });
};
