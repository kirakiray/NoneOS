import { getErr } from "../errors.js";
import { getCache } from "../cache/main.js";
import { RemoteBaseHandle } from "./base.js";
import { calculateHash, mergeChunks, readBufferByType } from "../util.js";
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
    debugger;

    // debugger;
    // const result = await this._bridge({
    //   method: "write",
    //   path: this._path,
    //   args: [data],
    // });

    // debugger;

    // return result;
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
        },
      ],
    });

    let buffer;

    if (options && (options.start || options.end)) {
      // 获取范围内的数据
      const remote_chunk_length = CHUNK_REMOTE_SIZE; // remote 的传送块大小

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
          const chunk = await getCache(hash);
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
      const chunks = await Promise.all(
        hashs.map(async (hash) => {
          return getCache(hash);
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
