import { getData, setData } from "./db.js";
import { getErr } from "../errors.js";

/**
 * 判断旧hash是否还被引用，清除不被引用的块
 * @param {array} oldHashs 旧的文件块数据
 */
export const clearHashs = async (oldHashs) => {
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
};

/**
 * 获取自身在db上的数据，带有判断自身是否被删除的逻辑
 * @param {(DirHandle|FileHandle)} handle
 * @param {string} errName 当判断到当前handle已经被删除，报错的时的name
 * @returns {Object}
 */
export const getSelfData = async (handle, errName) => {
  const data = await getData({ key: handle.id });

  if (!data) {
    throw getErr(
      "deleted",
      {
        name: errName,
        path: handle.path,
      },
      handle
    );
  }

  return data;
};

/**
 * 更新所有父层的修改时间
 * @param {string} id 目标handle的id
 */
export const updateParentsModified = async (id) => {
  const parents = [];
  const time = Date.now();

  let key = id;

  while (key) {
    const targeData = await getData({ key });
    if (!targeData) {
      break;
    }

    targeData.lastModified = time;
    parents.push(targeData);
    key = targeData.parent;
  }

  await setData({
    datas: parents,
  });
};

export const CHUNK_SIZE = 1024 * 1024; // 1mb
// const CHUNK_SIZE = 512 * 1024; // 512KB
// const CHUNK_SIZE = 1024 * 4; // 4kb

/**
 * 将输入的内容分割成多段，以1mb为一个块
 * @param {(string|file|arrayBuffer)} input 写入的内容
 * @returns {array} 分割后的内容
 */
export const splitIntoChunks = async (input, csize = CHUNK_SIZE) => {
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
  for (let i = 0; i < arrayBuffer.byteLength; i += csize) {
    const chunk = arrayBuffer.slice(i, i + csize);
    chunks.push(chunk);
  }

  return chunks;
};

/**
 * 将分割的块还原回原来的数据
 * @param {ArrayBuffer[]} chunks 分割的块
 * @returns {ArrayBuffer} 还原后的数据
 */
export const mergeChunks = (chunks) => {
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
export const calculateHash = async (arrayBuffer) => {
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

export const readBufferByType = ({ buffer, type, data, options }) => {
  // 根据type返回不同类型的数据
  if (type === "text") {
    return new TextDecoder().decode(buffer);
  } else if (type === "file") {
    if (options?.start || options?.end) {
      return new Blob([buffer.buffer]);
    }
    return new File([buffer.buffer], data.name, {
      lastModified: data.lastModified,
    });
  } else if (type === "base64") {
    return new Promise((resplve) => {
      const file = new File([buffer.buffer], data.name);
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.readAsDataURL(file);
    });
  } else {
    return buffer.buffer;
  }
};
