export const KIND = Symbol("kind");
import { getData } from "../db.js";

/**
 * 基础的Handle
 */
export class BaseHandle {
  #id;
  #path;
  #name;
  constructor(id) {
    this.#id = id;
  }

  /**
   * 获取当前handle在db中的id
   * @returns {string}
   */
  get id() {
    return this.#id;
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
    return this.#name;
  }

  /**
   * 获取当前handle的类型
   * @returns {string}
   */
  get kind() {
    return this[KIND];
  }

  /**
   * 获取根文件夹的handle
   * @returns {Promise<DirHandle>}
   */
  async root() {
    debugger;
  }

  /**
   * 获取父文件夹handle
   * @returns {Promise<DirHandle>}
   */
  async parent() {
    debugger;
  }

  // 移动当前handle
  // 当只有 name 的时候，表示移动到当前文件夹下重命名
  // 当带有路径地址时，代表剪切过去
  async move(path) {
    debugger;
    await this.refresh();
  }

  /**
   * 删除当前文件或文件夹
   * @returns {Promise<void>}
   */
  async remove() {
    debugger;
  }

  /**
   * 刷新当前文件或文件夹的信息（主要更新 path 和 name 的信息）
   * 当 handle 被 move方法执行成功后，需要及时更新信息
   */
  async refresh() {
    const data = await getData({ key: this.#id });
    this.#name = data.name;

    // 重新从db中获取parent数据并更新path
    const pathArr = [data.name];

    let currentData = data;
    while (currentData.parent !== "root") {
      currentData = await getData({ key: currentData.parent });
      pathArr.unshift(currentData.name);
    }

    this.#path = pathArr.join("/");
  }
}
