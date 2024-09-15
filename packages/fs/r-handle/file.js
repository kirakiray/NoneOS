import { getErr } from "../errors.js";
import { getCache, saveCache } from "./cache-util.js";
import { RemoteBaseHandle } from "./base.js";
import {
  calculateHash,
  mergeChunks,
  readBufferByType,
} from "../handle/util.js";

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
      method: "_getHashMap",
      path: this._path,
      args: [options],
    });

    // 桥接数据主要信息
    const bridgeData = result[0];

    if (result instanceof Array && bridgeData.bridgefile) {
      const hashs = result.slice(1); // 真正的哈希值数组
      let buffer;
      if (options && (options.start || options.end)) {
        // 获取范围内的数据
        const remote_chunk_length = 64 * 1024; // remote 的传送块大小

        const startBlockId = Math.floor(options.start / remote_chunk_length); // 开始的块id
        const endBlockId = Math.floor(options.end / remote_chunk_length); // 结束的块id

        const currentHashs = []; // 符合条件的哈希值块

        for (let i = startBlockId; i <= endBlockId; i++) {
          currentHashs.push({
            hash: hashs[i],
            index: i,
          });
        }

        const chunks = await Promise.all(
          currentHashs.map(async ({ hash, index }) => {
            const chunk = await getChunkByHash(hash, index, this);
            let reChunk = chunk;

            const start_position = index * remote_chunk_length; // 当前块的开始位置
            const end_position = (index + 1) * remote_chunk_length; // 当前块的结束位置

            // 精准截取对应块的内容
            if (end_position > options.end) {
              // 尾段内容
              reChunk = reChunk.slice(
                0,
                remote_chunk_length - (end_position - options.end)
              );
            }

            if (start_position < options.start) {
              // 首段内容
              reChunk = reChunk.slice(options.start - start_position);
            }

            return reChunk;
          })
        );

        buffer = mergeChunks(chunks);
      } else {
        // 获取完整的文件数据
        // 从远端获取响应的数据
        const chunks = await Promise.all(
          hashs.map(async (hash, index) => {
            return getChunkByHash(hash, index, this);
          })
        );

        buffer = mergeChunks(chunks);
      }

      return readBufferByType({
        buffer,
        type,
        data: { name: this.name },
        isChunk: options?.start || options?.end,
      });
    }

    debugger;

    return null;
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

const getChunkByHash = async (hash, index, _this) => {
  const cacheData = await getCache(hash);

  if (cacheData) {
    return cacheData;
  }

  const chunk = await _this._bridge({
    method: "_getBlock",
    path: _this._path,
    args: [hash, index],
  });

  // 确认数据的hash正确
  const chunkHash = await calculateHash(chunk);

  // 确保哈希一致后进行组装
  if (chunkHash === hash) {
    saveCache(hash, chunk);
    return chunk;
  }

  console.error("chunk hash error");
};
