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
  if (typeof arrayBuffer == "string") {
    const encoder = new TextEncoder();
    arrayBuffer = encoder.encode(arrayBuffer);
  }

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

export const readBufferByType = ({ buffer, type, data, isChunk }) => {
  // 根据type返回不同类型的数据
  if (type === "text") {
    return new TextDecoder().decode(buffer);
  } else if (type === "file") {
    if (isChunk) {
      return new Blob([buffer.buffer]);
    }
    return new File([buffer.buffer], data.name, {
      lastModified: data.lastModified,
    });
  } else if (type === "base64") {
    return new Promise((resolve) => {
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
