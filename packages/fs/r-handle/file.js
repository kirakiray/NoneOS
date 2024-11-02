import { RemoteBaseHandle } from "./base.js";

export class RemoteFileHandle extends RemoteBaseHandle {
  constructor(options) {
    super(options);
  }

  get kind() {
    return "file";
  }

  async read(...args) {
    const result = await this.bridge({
      method: "read",
      path: this.path,
      args,
    });

    return result;
  }

  async write(data) {
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
