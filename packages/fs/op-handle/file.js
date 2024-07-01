import { OriginBaseHandle, KIND } from "./base.js";

/**
 * 创建文件handle
 * @extends {OriginBaseHandle}
 */
export class OriginFileHandle extends OriginBaseHandle {
  /**
   * 创建一个文件句柄实例
   * @param {string} systemHandle -
   */
  constructor(systemHandle, path) {
    super(FileSystemFileHandle, path);
    this[KIND] = "file";
  }

  /**
   * 写入文件数据
   * @returns {Promise<void>}
   */
  async write(data, options) {
    // options = {
    //   process: () => {},
    // };
  }

  /**
   * 返回文件数据
   * @param {string} type 读取数据后返回的类型
   * @param {object} options 读取数据的选项
   * @returns {Promise<(File|String|Buffer)>}
   */
  async read(type, options) {
    // options = {
    //   start: 0,
    //   end,
    // };
  }

  /**
   * 返回文件数据
   * @param {object} options 读取数据的选项
   * @returns {Promise<File>}
   */
  file(options) {
    return this.read("file", options);
  }

  /**
   * 返回文件数据
   * @param {object} options 读取数据的选项
   * @returns {Promise<Text>}
   */
  text(options) {
    return this.read("text", options);
  }

  /**
   * 返回文件数据
   * @param {object} options 读取数据的选项
   * @returns {Promise<Buffer>}
   */
  buffer(options) {
    return this.read("buffer", options);
  }

  base64(options) {
    return this.read("base64", options);
  }
}
