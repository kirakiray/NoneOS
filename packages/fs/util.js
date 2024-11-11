// 获取目标文件或文件夹的任务树状信息
export const flatHandle = async (handle) => {
  if (handle.kind === "file") {
    return [await getFileData(handle)];
  }

  const arr = [];

  for await (let subHandle of handle.values()) {
    if (subHandle.kind === "dir") {
      const subs = await flatHandle(subHandle);
      arr.push(...subs);
    } else {
      arr.push(await getFileData(subHandle));
    }
  }

  return arr;
};

const getFileData = async (handle) => {
  const data = {
    size: await handle.size(),
    path: handle.path,
  };

  Object.defineProperty(data, "handle", {
    get() {
      return handle;
    },
  });

  return data;
};

export const CHUNK_REMOTE_SIZE = 128 * 1024; // 64kb // 远程复制的块大小

export const CHUNK_SIZE = 1024 * 1024; // 1mb // db数据库文件块的大小
// const CHUNK_SIZE = 512 * 1024; // 512KB
// const CHUNK_SIZE = 1024 * 4; // 4kb

/**
 * 将输入的内容分割成多段，以1mb为一个块
 * @param {(string|file|arrayBuffer)} input 写入的内容
 * @returns {array} 分割后的内容
 */
export const splitIntoBlobs = async (input, csize = CHUNK_SIZE) => {
  let blob;

  if (typeof input === "string") {
    blob = new Blob([new TextEncoder().encode(input)], { type: "text/plain" });
  } else if (input instanceof Blob) {
    blob = input;
  } else if (input instanceof ArrayBuffer || input instanceof Uint8Array) {
    blob = new Blob([input], { type: "application/octet-stream" });
  } else {
    throw new Error("Input must be a string, Blob, ArrayBuffer, or Uint8Array");
  }

  const blobs = [];
  for (let i = 0; i < blob.size; i += csize) {
    const chunk = blob.slice(i, i + csize);
    blobs.push(chunk);
  }

  return blobs;
};

/**
 * 将文件转成arraybuffer
 * @param {Blob} blob 二进制文件
 * @returns ArrayBuffer
 */
export const blobToBuffer = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(new Uint8Array(reader.result));
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
};

/**
 * 获取文件的哈希值
 * @param {arrayBuffer} arrayBuffer 文件的内容
 * @returns {string} 文件的哈希值
 */
export const calculateHash = async (arrayBuffer) => {
  if (typeof arrayBuffer == "string") {
    const encoder = new TextEncoder();
    arrayBuffer = encoder.encode(arrayBuffer);
  } else if (arrayBuffer instanceof Blob) {
    arrayBuffer = await blobToBuffer(arrayBuffer);
  }

  // 使用 SHA-256 哈希算法
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);

  // 将 ArrayBuffer 转换成十六进制字符串
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return hashHex;
};

export const readBlobByType = ({ blobData, type, data, isChunk }) => {
  // 根据type返回不同类型的数据
  if (type === "text") {
    try {
      return new Response(blobData).text();
    } catch (err) {
      debugger;
      throw err;
    }
  } else if (type === "file") {
    if (isChunk) {
      return blobData; // 如果是分块，则直接返回blobData
    }
    return new File([blobData], data.name, {
      lastModified: data.lastModified,
    });
  } else if (type === "base64") {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.readAsDataURL(blobData);
    });
  } else {
    return blobData; // 如果类型未知，直接返回blobData
  }
};

const invalidChars = /[<>:"\\|?*\x00-\x1F]/;
export function isValidPath(path) {
  // 定义不允许出现的特殊字符
  return !invalidChars.test(path);
}

/**
 * 获取文件的哈希值列表
 *
 * 本函数通过异步读取文件，并分块计算每个部分的哈希值，最后返回一个包含所有分块哈希值的数组
 * 这对于处理大文件非常有用，因为它允许分块处理文件，而不是一次性加载整个文件到内存中
 *
 * @param {File} file - 要计算哈希值的文件对象
 * @param {number} chunkSize - 每个文件块的大小，以字节为单位，默认为CHUNK_SIZE常量的值
 * @returns {Promise<Array<string>>} 返回一个Promise对象，解析为一个包含文件各分块哈希值的数组
 */
export const getHashs = async (file, chunkSize = CHUNK_SIZE) => {
  const hashs = [];

  for (let i = 0; i < file.size; i += chunkSize) {
    const chunk = file.slice(i, i + chunkSize);
    // 计算文件的哈希值
    const hash = await calculateHash(chunk);

    hashs.push(hash);
  }

  return hashs;
};
