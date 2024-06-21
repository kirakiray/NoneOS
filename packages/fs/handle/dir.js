import { BaseHandle, KIND } from "./base.js";

/**
 * 创建文件夹handle
 * @extends {BaseHandle}
 */
export class DirHandle extends BaseHandle {
  /**
   * 创建一个文件句柄实例
   * @param {string} id - 文件句柄的唯一标识符
   */
  constructor(id) {
    super(id);
    this[KIND] = "dir";
  }

  /**
   * 删除当前文件夹
   * @returns {Promise<void>}
   */
  async remove() {}

  /**
   * 获取子文件或目录的handle
   * @returns  {Promise<(FileHandle|DirHandle)>}
   */
  async get() {}
}
