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

    await Promise.all(
      chunks.map(async (chunk, index) => {
        const hash = await calculateHash(chunk);

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

        if (process) {
          process({ index, hash, exited });
        }
      })
    );
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
