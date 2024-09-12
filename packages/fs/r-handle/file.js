import { getErr } from "../errors.js";
import { RemoteBaseHandle } from "./base.js";

/**
 * 创建文件handle
 * @extends {RemoteBaseHandle}
 */
export class RemoteFileHandle extends RemoteBaseHandle {
  /**
   */
  constructor(path, bridgeFunc) {
    super(path, bridgeFunc, "file");
  }

  /**
   * 写入文件数据
   * @returns {Promise<void>}
   */
  async write(data) {
    debugger;
  }

  /**
   * 返回文件数据
   * @param {string} type 读取数据后返回的类型
   * @param {object} options 读取数据的选项
   * @returns {Promise<(File|String|Buffer)>}
   */
  async read(type = "text", options) {
    const result = await this._bridge({
      method: "read",
      path: this._path,
    });

    debugger;
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
