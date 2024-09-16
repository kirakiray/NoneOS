import { createHandle } from "./dir.js";

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
  async parent() {}

  /**
   * 移动当前文件或文件夹
   * 若 target 为字符串，则表示重命名
   * @param {(string|OriginDirHandle)} target 移动到目标的文件夹
   * @param {string} name 移动到目标文件夹下的名称
   */
  async moveTo(target, name) {}

  /**
   * 复制当前文件或文件夹
   * @param {(string|OriginDirHandle)} target 移动到目标的文件夹
   * @param {string} name 移动到目标文件夹下的名称
   */
  async copyTo(target, name) {}

  /**
   * 删除当前文件或文件夹
   * @returns {Promise<void>}
   */
  async remove() {}

  async refresh() {
    // Invalid method, compatible with handle
  }

  async size() {
    const result = await this._bridge({
      method: "size",
      path: this._path,
    });

    return result;
  }
}
