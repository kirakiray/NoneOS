import { BaseHandle } from "./base.js";
import { setData, getData } from "./db.js";
import {
  clearHashs,
  getSelfData,
  updateParentsModified,
  CHUNK_SIZE,
} from "./util.js";
import {
  splitIntoChunks,
  mergeChunks,
  calculateHash,
  readBufferByType,
} from "./util.js";

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
    super(id, "file");
  }

  /**
   * 写入文件数据
   * @returns {Promise<void>}
   */
  async write(data, options) {
    // options = {
    //   process: () => {},
    // };

    const targetData = await getSelfData(this, "write");

    const process = options?.process || (() => {});

    const chunks = await splitIntoChunks(data);

    const hashs = [];

    const size = data.length || data.size || 0;

    // 写入块
    await Promise.all(
      chunks.map(async (chunk, index) => {
        const hash = await calculateHash(chunk);

        hashs[index] = hash;

        const exited = await getData({
          storename: "blocks",
          key: hash,
        });

        if (!exited) {
          await setData({
            storename: "blocks",
            datas: [
              {
                hash,
                chunk,
              },
            ],
          });
        }

        process({
          index, // 写入块的序列
          length: chunks.length, // 写入块的总数
          hash, // 写入块的哈希值
          exited, // 写入块是否已经存在
        });
      })
    );

    const oldHashs = targetData.hashs || [];

    // 如果old更长，清除多出来的块
    const needRemoveBlocks = [];
    for (let i = 0; i < oldHashs.length; i++) {
      if (i >= hashs.length) {
        needRemoveBlocks.push(`${this.id}-${i}`);
      }
    }

    // 更新文件信息
    await setData({
      datas: [
        {
          ...targetData,
          lastModified: data?.lastModified || Date.now(),
          hashs,
          size,
        },
        ...hashs.map((hash, index) => {
          return {
            type: "block",
            key: `${this.id}-${index}`,
            hash,
          };
        }),
      ],
      removes: needRemoveBlocks,
    });

    if (oldHashs.length) {
      await clearHashs(oldHashs);
    }

    await updateParentsModified(targetData.parent);
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

    const data = await getSelfData(this, "读取数据");

    // 重新组合文件
    const { hashs } = data;

    let chunks = [];
    if (options && (options.start || options.end)) {
      // 获取指定范围内的数据
      let startBlockId = Math.floor(options.start / CHUNK_SIZE);
      let endBlockId = Math.floor(options.end / CHUNK_SIZE);

      chunks = await Promise.all(
        hashs.map(async (hash, index) => {
          let chunk;

          if (index >= startBlockId && index <= endBlockId) {
            const data = await getData({
              storename: "blocks",
              key: hash,
            });

            chunk = data.chunk;

            if (startBlockId === endBlockId) {
              chunk = chunk.slice(
                options.start - index * CHUNK_SIZE,
                options.end - index * CHUNK_SIZE
              );
            } else if (index === startBlockId) {
              chunk = chunk.slice(
                -1 * ((startBlockId + 1) * CHUNK_SIZE - options.start)
              );
            } else if (index === endBlockId) {
              chunk = chunk.slice(0, options.end - endBlockId * CHUNK_SIZE);
            }
          }

          return chunk;
        })
      );
      chunks = chunks.filter((e) => !!e);
    } else {
      if (hashs) {
        chunks = await Promise.all(
          hashs.map(async (hash, index) => {
            const { chunk } = await getData({
              storename: "blocks",
              key: hash,
            });

            return chunk;
          })
        );
      }
    }

    const buffer = mergeChunks(chunks);

    return readBufferByType({ buffer, type, data, options });

    // // 根据type返回不同类型的数据
    // if (type === "text") {
    //   return new TextDecoder().decode(buffer);
    // } else if (type === "file") {
    //   if (options?.start || options?.end) {
    //     return new Blob([buffer.buffer]);
    //   }
    //   return new File([buffer.buffer], data.name, {
    //     lastModified: data.lastModified,
    //   });
    // } else if (type === "base64") {
    //   return new Promise((resplve) => {
    //     const file = new File([buffer.buffer], data.name);
    //     const reader = new FileReader();
    //     reader.onload = () => {
    //       resolve(reader.result);
    //     };
    //     reader.readAsDataURL(file);
    //   });
    // } else {
    //   return buffer.buffer;
    // }
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

  // 从块从拆分文件，给远端用的
  async _getBlock(hash) {
    const file = await this.file();

    const hashMap = new Map();

    const chunks = await splitIntoChunks(file, 64 * 1024);

    await Promise.all(
      chunks.map(async (chunk) => {
        const hash = await calculateHash(chunk);
        hashMap.set(hash, chunk);
      })
    );

    return hashMap.get(hash);
  }
}
