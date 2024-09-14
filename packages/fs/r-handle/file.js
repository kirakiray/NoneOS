import { getErr } from "../errors.js";
import { getCache, saveCache } from "./cache-util.js";
import { RemoteBaseHandle } from "./base.js";
import { calculateHash, mergeChunks } from "../handle/util.js";

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

    if (result instanceof Array && result[0] === "__bridge_file") {
      // 从远端获取响应的数据
      const chunks = await Promise.all(
        result.slice(1).map(async (hash, index) => {
          const chunk = await this._bridge({
            method: "_getBlock",
            path: this._path,
            args: [hash, index],
          });

          // 确认数据的hash正确
          const chunkHash = await calculateHash(chunk);

          // 确保哈希一致后进行组装
          if (chunkHash === hash) {
            return chunk;
          }

          console.error("chunk hash error");
          debugger;
        })
      );

      const buf = mergeChunks(chunks);

      return new File(buf, this.name);
    }

    return result;
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
