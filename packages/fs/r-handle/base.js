import { getErr } from "../errors.js";
import { getTargetAndName } from "../public.js";

/**
 * 基础的Handle
 */
export class RemoteBaseHandle {
  #path;
  #name;
  #kind;
  constructor(path) {}
  /**
   * 获取当前handle的唯一id
   * @returns {string}
   */
  get id() {}

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
    return this.#name;
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
  async root() {}

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
}
