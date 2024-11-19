import { getErr } from "../errors.js";
import { calculateHash, getHashs } from "../util.js";
import { OriginBaseHandle } from "./base.js";

/**
 * 创建文件handle
 * @extends {OriginBaseHandle}
 */
export class OriginFileHandle extends OriginBaseHandle {
  /**
   * 创建一个文件句柄实例
   * @param {string} systemHandle -
   */
  constructor(systemHandle, path, root) {
    super(systemHandle, path, root);
  }

  /**
   * 写入文件数据
   * @returns {Promise<void>}
   */
  async write(data, callback) {
    try {
      const writer = await this._fsh.createWritable();

      callback &&
        callback({
          type: "write-file-start",
          path: this.path,
          index: 0, // 写入块的序列
          length: 1, // 写入块的总数
        });

      await writer.write(data);
      await writer.close();

      callback &&
        callback({
          type: "write-file-end",
          path: this.path,
          index: 0, // 写入块的序列
          length: 1, // 写入块的总数
        });
    } catch (err) {
      const error = getErr("writefile", { path: this.path }, err);
      console.error(error);
      throw error;
    }
  }

  async createWritable() {
    return this._fsh.createWritable();
  }

  /**
   * 返回文件数据
   * @param {string} type 读取数据后返回的类型
   * @param {object} options 读取数据的选项
   * @returns {Promise<(File|String|Buffer)>}
   */
  async read(type = "text", options) {
    // options = {
    //   start: 0,
    //   end,
    // };

    let file = await this._fsh.getFile();

    if (options && (options.start || options.end)) {
      file = file.slice(options.start, options.end);
    }

    return new Promise((resolve) => {
      let reader = new FileReader();
      reader.onload = (event) => {
        resolve(event.target.result);
      };

      switch (type) {
        case "file":
          reader.onload = null;
          reader = null;
          resolve(file);
          break;
        case "text":
          reader.readAsText(file);
          break;
        case "base64":
          reader.readAsDataURL(file);
          break;
        case "buffer":
        default:
          reader.readAsArrayBuffer(file);
          break;
      }
    });
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
