export const KIND = Symbol("kind");

/**
 * 基础的Handle
 */
export class BaseHandle {
  #id;
  constructor(id) {
    this.#id = id;
  }

  get id() {
    return this.#id;
  }

  /**
   * 获取当前handle的类型
   * @returns {string}
   */
  get kind() {
    return this[KIND];
  }

  /**
   * 获取当前handle的路径
   * @returns {Promise<string>}
   */
  get path() {
    return new Promise((resolve, reject) => {});
  }

  /**
   * 获取根文件夹的handle
   * @returns {Promise<DirHandle>}
   */
  get root() {
    return new Promise((resolve, reject) => {});
  }

  /**
   * 获取父文件夹handle
   * @returns {Promise<DirHandle>}
   */
  get parent() {
    return new Promise((resolve, reject) => {});
  }

  /**
   * 获取文件名
   * @returns {Promise<String>}
   */
  get name() {
    return new Promise((resolve, reject) => {});
  }

  // 移动当前handle
  // 当只有 name 的时候，表示移动到当前文件夹下重命名
  // 当带有路径地址时，代表剪切过去
  async move(path) {}
}
