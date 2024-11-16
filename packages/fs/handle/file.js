import { BaseHandle } from "./base.js";
import { setData, getData } from "./db.js";
import { clearHashs, getSelfData, updateParentsModified } from "./util.js";

import {
  CHUNK_SIZE,
  calculateHash,
  getHashs,
  readBlobByType,
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
    const writer = await this.createWritable();

    const size = data.length || data.size || data.byteLength || 0;

    const length = Math.ceil(size / CHUNK_SIZE);

    writer.onbeforewrite = (e) => {
      callback &&
        callback({
          ...e,
          length,
          type: "write-file-start",
        });
    };

    writer.onwrite = (e) => {
      callback &&
        callback({
          ...e,
          length,
          type: "write-file-end",
        });
    };

    await writer.write(data);
    await writer.close();

    return true;
  }

  // 写入数据流
  async createWritable() {
    return new DBFSWritableFileStream(this.id, this.path);
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

    let blobs = [];
    if (options && (options.start || options.end)) {
      // 获取指定范围内的数据
      let startBlockId = Math.floor(options.start / CHUNK_SIZE);
      let endBlockId = Math.floor(options.end / CHUNK_SIZE);

      blobs = await Promise.all(
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

          if (chunk) {
            if (chunk instanceof Blob) {
              return chunk;
            }

            return new Blob([chunk], {
              type: "application/octet-stream",
            });
          }
        })
      );
      blobs = blobs.filter((e) => !!e);
    } else {
      if (hashs) {
        blobs = await Promise.all(
          hashs.map(async (hash, index) => {
            const result = await getData({
              storename: "blocks",
              key: hash,
            });

            const { chunk } = result;

            if (chunk instanceof Blob) {
              return chunk;
            }

            return new Blob([chunk]);
          })
        );
      }
    }

    const blobData = new Blob(blobs, {
      type: "application/octet-stream",
    });

    return await readBlobByType({
      blobData,
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
  // 获取1mb分区哈希块数组
  async _getHashs(options) {
    const chunkSize = options?.chunkSize || CHUNK_SIZE;

    if (chunkSize !== CHUNK_SIZE) {
      return getHashs(await this.file(), chunkSize);
    }

    const targetData = await getData({
      key: this.id,
    });

    if (!targetData) {
      return null;
    }

    return targetData.hashs;
  }
}

// 虚拟文件系统的文件流
class DBFSWritableFileStream {
  #fileID; // 目标文件id
  #cache = new ArrayBuffer(); // 给内存缓冲区用的变量，1mb大小
  #hashs = []; // 写入块的哈希值
  #size = 0;
  #path;
  constructor(id, path) {
    this.#fileID = id;
    this.#path = path;
  }

  // 写入流数据
  // async write(input) {
  //   let arrayBuffer;

  //   if (typeof input === "string") {
  //     arrayBuffer = new TextEncoder().encode(input).buffer;
  //   } else if (input instanceof Blob) {
  //     arrayBuffer = await input.arrayBuffer();
  //   } else if (input instanceof ArrayBuffer) {
  //     arrayBuffer = input;
  //   } else if (input instanceof Uint8Array) {
  //     arrayBuffer = input.buffer;
  //   } else {
  //     throw new Error(
  //       "Input must be a string, File object or ArrayBuffer object"
  //     );
  //   }
  //   this.#size += arrayBuffer.byteLength;

  //   // 写入缓存区
  //   this.#cache = mergeArrayBuffers(this.#cache, arrayBuffer);

  //   // 根据缓冲区写入到硬盘
  //   while (this.#cache.byteLength > CHUNK_SIZE) {
  //     // 取出前1mb的数据
  //     const targetChunk = this.#cache.slice(0, CHUNK_SIZE);
  //     this.#cache = this.#cache.slice(CHUNK_SIZE);

  //     const hash = await this._writeChunk(targetChunk);
  //     this.#hashs.push(hash);
  //   }
  // }

  // 写入流数据
  async write(input) {
    let blob;

    if (typeof input === "string") {
      // 将字符串转换为Blob
      blob = new Blob([new TextEncoder().encode(input)], {
        type: "text/plain",
      });
    } else if (input instanceof Blob) {
      // 输入已经是Blob
      blob = input;
    } else if (input instanceof ArrayBuffer || input instanceof Uint8Array) {
      // 将ArrayBuffer或Uint8Array转换为Blob
      blob = new Blob([input], { type: "application/octet-stream" });
    } else {
      throw new Error(
        "Input must be a string, Blob, ArrayBuffer or Uint8Array"
      );
    }

    // 更新大小
    this.#size += blob.size;

    // 将新的Blob与缓存合并
    this.#cache = this.#mergeBlobs(this.#cache, blob);

    // 根据缓冲区写入到硬盘
    while (this.#cache.size > CHUNK_SIZE) {
      // 取出前CHUNK_SIZE的数据
      const targetChunk = this.#cache.slice(0, CHUNK_SIZE);
      this.#cache = this.#cache.slice(CHUNK_SIZE);

      const hash = await this._writeChunk(targetChunk);
      this.#hashs.push(hash);
    }
  }

  // 合并两个Blob
  #mergeBlobs(blob1, blob2) {
    return new Blob([blob1, blob2], { type: "application/octet-stream" });
  }

  // 写入真正的内容
  async _writeChunk(chunk) {
    const hash = await calculateHash(chunk);

    // 查看是否有缓存
    const exited = await getData({
      storename: "blocks",
      key: hash,
    });

    const chunkData = {
      path: this.#path,
      index: this.#hashs.length, // 写入块的序列
      hash, // 写入块的哈希值
      exited, // 写入块是否已经存在
    };

    if (this.onbeforewrite) {
      this.onbeforewrite({
        type: "onbeforewrite",
        ...chunkData,
      });
    }

    let reChunk = chunk;

    if (isSafari) {
      // 🖕: 垃圾 safari 存储 blob引用，底层数据会出错，要改用 arraybuffer
      reChunk = await new Promise((res) => {
        const reader = new FileReader();
        reader.readAsArrayBuffer(chunk);
        reader.onload = () => res(reader.result);
      });
    }

    // 写入到硬盘
    if (!exited) {
      await setData({
        storename: "blocks",
        datas: [
          {
            hash,
            chunk: reChunk,
          },
        ],
      });
    }

    if (this.onwrite) {
      this.onwrite({
        type: "onwrite",
        ...chunkData,
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
      return;
    }

    // 写入最后一缓存的内容
    if (this.#cache.size > 0) {
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
          needRemoveBlocks.push(`${this.#fileID}-${i}`);
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
  async abort() {
    // 清除缓存
    if (this.#hashs) {
      await clearHashs(this.#hashs);
    }
  }
}

// // 合并buffer数据的方法
// function mergeArrayBuffers(buffer1, buffer2) {
//   // 计算新 ArrayBuffer 的总长度
//   const totalLength = buffer1.byteLength + buffer2.byteLength;

//   // 创建一个新的 ArrayBuffer
//   const mergedBuffer = new ArrayBuffer(totalLength);

//   // 创建一个 Uint8Array 以便操作新的 ArrayBuffer
//   const uint8Array = new Uint8Array(mergedBuffer);

//   // 复制第一个 ArrayBuffer 的数据
//   uint8Array.set(new Uint8Array(buffer1), 0);

//   // 复制第二个 ArrayBuffer 的数据
//   uint8Array.set(new Uint8Array(buffer2), buffer1.byteLength);

//   return mergedBuffer;
// }

const isSafari =
  navigator.userAgent.includes("Safari") &&
  !navigator.userAgent.includes("Chrome");
