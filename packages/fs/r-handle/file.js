import { getErr } from "../errors.js";
import { saveCache } from "../cache/util.js";
import { fetchCache } from "../cache/main.js";
import { RemoteBaseHandle } from "./base.js";
import {
  calculateHash,
  mergeChunks,
  readBufferByType,
  splitIntoChunks,
} from "../util.js";
import { CHUNK_REMOTE_SIZE } from "../util.js";

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
   * 最大只能写入 REMOTE_CHUNK_SIZE 大小的数据
   * @returns {Promise<void>}
   */
  async write(data) {
    // 将数据缓冲到缓存池，等待远端获取
    const chunks = await splitIntoChunks(data);

    const hashs = [];
    await Promise.all(
      chunks.map(async (chunk, i) => {
        const hash = await calculateHash(chunk);
        hashs[i] = hash;
        await saveCache(hash, chunk);
      })
    );

    // 推送给对方进行组装
    const result = await this._bridge({
      method: "_writeByCache",
      path: this._path,
      args: [
        {
          hashs,
        },
      ],
    });

    return result;
  }

  /**
   * 返回文件数据
   * @param {string} type 读取数据后返回的类型
   * @param {object} options 读取数据的选项
   * @returns {Promise<(File|String|Buffer)>}
   */
  async read(type = "text", options) {
    // 通知对面保存块
    const hashs = await this._bridge({
      method: "_saveCache",
      path: this._path,
      args: [
        {
          size: CHUNK_REMOTE_SIZE,
          returnHashs: true, // 返回哈希数组
          options,
        },
      ],
    });

    const chunks = await Promise.all(
      hashs.map(async (hash) => {
        return fetchCache(hash);
      })
    );

    const buffer = mergeChunks(chunks);

    return readBufferByType({
      buffer,
      type,
      data: { name: this.name },
      isChunk: options?.start || options?.end,
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
