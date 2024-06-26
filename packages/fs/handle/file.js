import { BaseHandle, KIND } from "./base.js";
import { setData, getData } from "../db.js";

const CHUNK_SIZE = 1024 * 1024; // 1mb
// const CHUNK_SIZE = 512 * 1024; // 512KB
// const CHUNK_SIZE = 1024 * 4; // 4kb

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
    super(id);
    this[KIND] = "file";
  }

  /**
   * 写入文件数据
   * @returns {Promise<void>}
   */
  async write(data, options) {
    // options = {
    //   process: () => {},
    // };

    const process = options?.process || (() => {});

    const chunks = await splitIntoChunks(data);

    const hashs = [];

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

    // 更新文件信息
    const targetData = await getData({
      key: this.id,
    });

    const oldHashs = targetData.hashs || [];

    // 如果old更长，清除多出来的块
    const needRemoveBlocks = [];
    for (let i = 0; i < oldHashs.length; i++) {
      if (i >= hashs.length) {
        needRemoveBlocks.push(`${this.id}-${i}`);
      }
    }
    await setData({
      datas: [
        {
          ...targetData,
          lastModified: data?.lastModified || Date.now(),
          length: data.length,
          hashs,
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
      // 查找并删除多余的块
      const needRemoves = [];
      await Promise.all(
        oldHashs.map(async (key) => {
          const exited = await getData({
            index: "hash",
            key,
          });

          !exited && needRemoves.push(key);
        })
      );

      if (needRemoves.length) {
        await setData({
          storename: "blocks",
          removes: needRemoves,
        });
      }
    }
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

    const data = await getData({
      key: this.id,
    });

    // 重新组合文件
    const { hashs } = data;

    let chunks;
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

    const mergedArrayBuffer = mergeChunks(chunks);

    // 根据type返回不同类型的数据
    if (type === "text") {
      return new TextDecoder().decode(mergedArrayBuffer);
    } else if (type === "file") {
      if (options?.start || options?.end) {
        return new Blob([mergedArrayBuffer.buffer]);
      }
      return new File([mergedArrayBuffer.buffer], data.name, {
        lastModified: data.lastModified,
      });
    } else {
      return mergedArrayBuffer.buffer;
    }
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
}

/**
 * 将输入的内容分割成多段，以1mb为一个块
 * @param {(string|file|arrayBuffer)} input 写入的内容
 * @returns {array} 分割后的内容
 */
const splitIntoChunks = async (input) => {
  // const CHUNK_SIZE = 1024 * 1024; // 1mb
  // const CHUNK_SIZE = 512 * 1024; // 512KB
  // const CHUNK_SIZE = 1024 * 4; // 4kb
  let arrayBuffer;

  if (typeof input === "string") {
    arrayBuffer = new TextEncoder().encode(input).buffer;
  } else if (input instanceof File) {
    arrayBuffer = await input.arrayBuffer();
  } else if (input instanceof ArrayBuffer) {
    arrayBuffer = input;
  } else {
    throw new Error(
      "Input must be a string, File object or ArrayBuffer object"
    );
  }

  const chunks = [];
  for (let i = 0; i < arrayBuffer.byteLength; i += CHUNK_SIZE) {
    const chunk = arrayBuffer.slice(i, i + CHUNK_SIZE);
    chunks.push(chunk);
  }

  return chunks;
};

/**
 * 将分割的块还原回原来的数据
 * @param {ArrayBuffer[]} chunks 分割的块
 * @returns {ArrayBuffer} 还原后的数据
 */
const mergeChunks = (chunks) => {
  // 计算总长度
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);

  const mergedArrayBuffer = new Uint8Array(totalLength);

  let offset = 0;
  chunks.forEach((chunk) => {
    mergedArrayBuffer.set(new Uint8Array(chunk), offset);
    offset += chunk.byteLength;
  });

  return mergedArrayBuffer;
};

/**
 * 获取文件的哈希值
 * @param {arrayBuffer} arrayBuffer 文件的内容
 * @returns {string} 文件的哈希值
 */
const calculateHash = async (arrayBuffer) => {
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const centerId = Math.floor(arrayBuffer.byteLength / 2);
  return (
    hashHex +
    new Uint8Array(arrayBuffer.slice(centerId, centerId + 1))[0].toString(16)
  );
};
