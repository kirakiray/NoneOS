import { BaseHandle, KIND } from "./base.js";
import { setData, getData } from "../db.js";

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

    const process = options?.process;

    const chunks = await splitIntoChunks(data);

    const hashs = [];

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

        process &&
          process({
            index, // 写入块的序列
            length: chunks.length, // 写入块的总数
            hash, // 写入块的哈希值
            exited, // 写入块是否已经存在
          });
      })
    );

    const targetData = await getData({
      key: this.id,
    });

    await setData({
      datas: [
        {
          ...targetData,
          lastModified: data?.lastModified || Date.now(),
          length: data.length,
          hashs,
        },
      ],
    });
  }

  /**
   * 返回文件数据
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

    const chunks = await Promise.all(
      hashs.map(async (hash, index) => {
        const { chunk } = await getData({
          storename: "blocks",
          key: hash,
        });

        return chunk;
      })
    );

    return mergeChunks(chunks, type, [
      data.name,
      {
        lastModified: data.lastModified,
      },
    ]);
  }

  /**
   * 返回文件数据
   * @returns {Promise<File>}
   */
  file() {
    return this.read("file");
  }

  /**
   * 返回文件数据
   * @returns {Promise<Text>}
   */
  text() {
    return this.read("text");
  }

  /**
   * 返回文件数据
   * @returns {Promise<Buffer>}
   */
  buffer() {
    return this.read("buffer");
  }
}

/**
 * 将输入的内容分割成多段，以1mb为一个块
 * @param {(string|file|arrayBuffer)} input 写入的内容
 * @returns {array} 分割后的内容
 */
const splitIntoChunks = async (input) => {
  const CHUNK_SIZE = 1024 * 1024; // 1mb
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
 * @param {string} type 返回的数据类型，可以是 "arrayBuffer"、"text" 或 "file"
 * @param {array} [fileOptions] 当 type 为 "file" 时，指定文件名
 * @returns {ArrayBuffer|string|File} 还原后的数据
 */
const mergeChunks = (chunks, type, fileOptions) => {
  // 计算总长度
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);

  const mergedArrayBuffer = new Uint8Array(totalLength);

  let offset = 0;
  chunks.forEach((chunk) => {
    mergedArrayBuffer.set(new Uint8Array(chunk), offset);
    offset += chunk.byteLength;
  });

  // 根据type返回不同类型的数据
  if (type === "text") {
    return new TextDecoder().decode(mergedArrayBuffer);
  } else if (type === "file") {
    return new File([mergedArrayBuffer.buffer], ...fileOptions);
  } else {
    return mergedArrayBuffer.buffer;
  }
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
