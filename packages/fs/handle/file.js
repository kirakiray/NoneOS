import { BaseHandle } from "./base.js";
import { setData, getData } from "./db.js";
import { clearHashs, getSelfData, updateParentsModified } from "./util.js";

import {
  CHUNK_SIZE,
  splitIntoChunks,
  mergeChunks,
  calculateHash,
  readBufferByType,
} from "../util.js";

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
  async write(data, callback) {
    const targetData = await getSelfData(this, "write");

    const chunks = await splitIntoChunks(data);

    const hashs = [];

    const size = data.length || data.size || data.byteLength || 0;

    // 写入块
    await Promise.all(
      chunks.map(async (chunk, index) => {
        const hash = await calculateHash(chunk);

        hashs[index] = hash;

        const exited = await getData({
          storename: "blocks",
          key: hash,
        });

        const chunkData = {
          index, // 写入块的序列
          length: chunks.length, // 写入块的总数
          hash, // 写入块的哈希值
          exited, // 写入块是否已经存在
        };

        callback &&
          callback({
            type: "write-file-start",
            path: this.path,
            ...chunkData,
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

        callback &&
          callback({
            type: "write-file-end",
            path: this.path,
            ...chunkData,
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

  // 写入数据流
  async createWritable() {
    return new DBFSWritableFileStream(this.id);
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

    return readBufferByType({
      buffer,
      type,
      data,
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

// 虚拟文件系统的文件流
class DBFSWritableFileStream {
  #fileID; // 目标文件id
  #cache = new ArrayBuffer(); // 给内存缓冲区用的变量，1mb大小
  #hashs = []; // 写入块的哈希值
  #size = 0;
  constructor(id) {
    this.#fileID = id;

    console.log(id);
  }

  // 写入流数据
  async write(input) {
    let arrayBuffer;

    if (typeof input === "string") {
      arrayBuffer = new TextEncoder().encode(input).buffer;
    } else if (input instanceof File) {
      arrayBuffer = await input.arrayBuffer();
    } else if (input instanceof ArrayBuffer) {
      arrayBuffer = input;
    }

    this.#size += arrayBuffer.byteLength;

    // 写入缓存区
    this.#cache = mergeArrayBuffers(this.#cache, arrayBuffer);

    // 根据缓冲区写入到硬盘
    while (this.#cache.byteLength > CHUNK_SIZE) {
      // 取出前1mb的数据
      const targetChunk = this.#cache.slice(0, CHUNK_SIZE);
      this.#cache = this.#cache.slice(CHUNK_SIZE);

      const hash = await this._writeChunk(targetChunk);
      this.#hashs.push(hash);
    }
  }

  // 写入真正的内容
  async _writeChunk(chunk) {
    const hash = await calculateHash(chunk);

    // 查看是否有缓存
    const exited = await getData({
      storename: "blocks",
      key: hash,
    });

    // 写入到硬盘
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

    return hash;
  }

  // 确认写入到对应的位置
  async close() {
    const targetData = await getSelfData({ id: this.#fileID }, "write");

    if (!targetData) {
      // 文件不在就直接弃用
      await this.abort();
    }

    // 写入最后一点内容
    if (this.#cache.byteLength > 0) {
      const hash = await this._writeChunk(this.#cache);
      this.#hashs.push(hash);
    }

    {
      // 写入对应路径的文件
      const oldHashs = targetData.hashs || [];
      const hashs = this.#hashs;
      const size = this.#size;

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
            lastModified: Date.now(),
            hashs,
            size,
          },
          ...hashs.map((hash, index) => {
            return {
              type: "block",
              key: `${this.#fileID}-${index}`,
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
  }

  // 放弃存储的内容
  async abort() {}
}

function mergeArrayBuffers(buffer1, buffer2) {
  // 计算新 ArrayBuffer 的总长度
  const totalLength = buffer1.byteLength + buffer2.byteLength;

  // 创建一个新的 ArrayBuffer
  const mergedBuffer = new ArrayBuffer(totalLength);

  // 创建一个 Uint8Array 以便操作新的 ArrayBuffer
  const uint8Array = new Uint8Array(mergedBuffer);

  // 复制第一个 ArrayBuffer 的数据
  uint8Array.set(new Uint8Array(buffer1), 0);

  // 复制第二个 ArrayBuffer 的数据
  uint8Array.set(new Uint8Array(buffer2), buffer1.byteLength);

  return mergedBuffer;
}
