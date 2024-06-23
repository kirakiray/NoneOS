import { BaseHandle, KIND } from "./base.js";

/**
 * 创建文件handle
 * @extends {BaseHandle}
 */
export class FileHandle extends BaseHandle {
  /**
   * 创建一个文件句柄实例
   * @param {string} id - 文件句柄的唯一标识符
   */
  constructor(id) {
    super(id);
    this[KIND] = "file";
  }

  /**
   * 写入文件数据
   * @returns {Promise<void>}
   */
  async write(data) {}

  /**
   * 返回文件数据
   * @returns {Promise<(File|String|Buffer)>}
   */
  async read(type) {}

  /**
   * 返回文件数据
   * @returns {Promise<File>}
   */
  file() {
    return this.read("file");
  }

  /**
   * 返回文件数据
   * @returns {Promise<Text>}
   */
  text() {
    return this.read("text");
  }

  /**
   * 返回文件数据
   * @returns {Promise<Buffer>}
   */
  buffer() {
    return this.read("buffer");
  }
}
