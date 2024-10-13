import { createHandle } from "./dir.js";
import { copyTo } from "../public.js";

/**
 * 基础的Handle
 */
export class RemoteBaseHandle {
  #path; // 显式路径
  _path; // 远程的真实路径
  #kind;
  _bridge = null;
  #data;
  constructor(path, bridgeFunc, kind) {
    this.#kind = kind;
    this.#path = path;
    this._bridge = bridgeFunc;

    const pathArr = path.split("/");
    const rootInfo = pathArr[0].split(":");
    // const userid = rootInfo[1];
    const rootName = rootInfo[2];

    this._path = [rootName, ...pathArr.slice(1)].join("/");
  }

  _init(data) {
    this.#data = data;
  }

  /**
   * 获取当前handle的唯一id
   * @returns {string}
   */
  get id() {
    return this.#data.id;
  }

  get lastModified() {
    return this.#data.lastModified;
  }

  get createTime() {
    return this.#data.createTime;
  }

  /**
   * 获取当前handle的路径
   * @returns {string}
   */
  get path() {
    return this.#path;
  }

  /**
   * 获取文件名
   * @returns {string}
   */
  get name() {
    return this.#data.name;
  }

  /**
   * 获取当前handle的类型
   * @returns {string}
   */
  get kind() {
    return this.#kind;
  }

  /**
   * 获取根文件夹的handle
   * @returns {Promise<OriginDirHandle>}
   */
  async root() {
    const result = await this._bridge({
      method: "root",
      path: this._path,
    });

    return await createHandle(result, this);
  }

  /**
   * 获取父文件夹handle
   * @returns {Promise<OriginDirHandle>}
   */
  async parent() {
    const result = await this._bridge({
      method: "parent",
      path: this._path,
    });

    return await createHandle(result, this);
  }

  /**
   * 移动当前文件或文件夹
   * 若 target 为字符串，则表示重命名
   * @param {(string|OriginDirHandle)} target 移动到目标的文件夹
   * @param {string} name 移动到目标文件夹下的名称
   */
  async moveTo(target, name) {
    throw new Error(`Please use the copyTo operation before deleting.`);
  }

  /**
   * 复制当前文件或文件夹
   * @param {(string|OriginDirHandle)} target 移动到目标的文件夹
   * @param {string} name 移动到目标文件夹下的名称
   */
  async copyTo(target, name) {
    throw new Error(`Please use the copyTo operation before deleting.`);
  }

  /**
   * 删除当前文件或文件夹
   * @returns {Promise<void>}
   */
  async remove(...args) {
    const result = await this._bridge({
      method: "remove",
      path: this._path,
      args,
    });

    return result;
  }

  async refresh() {
    // Invalid method, compatible with handle
  }

  get _mark() {
    return "remote";
  }

  async size() {
    const result = await this._bridge({
      method: "size",
      path: this._path,
    });

    return result;
  }

  async _getHashs(...args) {
    const result = await this._bridge({
      method: "_getHashs",
      path: this._path,
      args,
    });

    return result;
  }

  async _mergeChunk(...args) {
    const result = await this._bridge({
      method: "_mergeChunk",
      path: this._path,
      args,
    });

    return result;
  }

  async flat(...args) {
    const result = await this._bridge({
      method: "flat",
      path: this._path,
      args,
    });

    // 带有remote根的路径
    const rootName = this.path.split("/")[0];

    // 修正写入的字段
    result.forEach((e) => {
      const relatePath = e.path.replace(this._path + "/", "");

      // 修正根路径
      const pathArr = e.path.split("/");
      pathArr[0] = rootName;
      e.path = pathArr.join("/");

      Object.defineProperty(e, "handle", {
        get: async () => {
          return this.get(relatePath);
        },
      });
    });

    return result;
  }
}
