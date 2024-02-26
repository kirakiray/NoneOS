import { getData, setData, find, getRandomId } from "./db.js";
export const DIR = "directory";

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

const splitIntoChunks = async (input) => {
  const CHUNK_SIZE = 512 * 1024; // 512KB
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

// 直接写入文件，并返回文件的hash
export const writeContent = async ({ content, process, handle }) => {
  const results = await splitIntoChunks(content);

  const tasks = [];
  let total = results.length;
  let count = 0;

  await Promise.all(
    results.map(async (arrayBuffer, index) => {
      const hash = await calculateHash(arrayBuffer);

      // 判断是否有重复，有重复就不写入了
      const oldBlock = await getData({
        storeName: "files",
        key: hash,
      });

      if (!oldBlock) {
        // 不存在历史数据的情况下写入数据
        await setData({
          storeName: "files",
          datas: [
            {
              hash,
              content: arrayBuffer,
            },
          ],
        });
      }

      tasks.push({
        hash,
        index,
      });

      count++;

      process &&
        process({
          hasOld: !!oldBlock,
          index,
          total,
          count,
        });
    })
  );

  // 拿出旧的和新的对比，多余的块就删除,新增的块就写入；
  const oldKeys = (
    await getData({
      keyName: "parent",
      key: handle.dbkey,
      all: 1,
    })
  ).map((e) => e.key);

  const adds = []; // 需要新添加的块
  const newHashKey = [];

  tasks.forEach(({ hash, index }) => {
    const key = `${handle.dbkey}_${index}_${hash}`;
    newHashKey.push(key);

    if (oldKeys.includes(key)) {
      return;
    }

    adds.push({
      key,
      index,
      type: "block",
      parent: handle.dbkey,
      fileHash: hash,
    });
  });

  const needDelete = [];
  oldKeys.forEach((key) => !newHashKey.includes(key) && needDelete.push(key));

  if (adds.length || needDelete.length) {
    await setData({
      datas: adds,
      removes: needDelete,
    });

    setTimeout(() => {
      clearCache(needDelete.map((key) => key.split("_").slice(-1)[0]));
    }, 100);
  }
};

// 清除 files 表上未被使用过的文件块
const clearCache = async (hashs) => {
  if (!hashs || !hashs.length) {
    return;
  }

  // 查看仓库内是否有其他模块使用相同的hash block，没有的话就直接从 files 中删除
  const reNeedDelete = [];

  await Promise.all(
    hashs.map(async (hash) => {
      const data = await getData({
        keyName: "fileHash",
        key: hash,
      });

      if (!data) {
        // 没有被使用，证明可以删除掉了
        reNeedDelete.push(hash);
      }
    })
  );

  // 没有被使用，证明可以删除掉了
  await setData({
    storeName: "files",
    removes: reNeedDelete,
  });
};

function mergeArrayBuffers(buffers) {
  // 计算所有ArrayBuffer的总长度
  let totalLength = buffers.reduce((total, buf) => total + buf.byteLength, 0);

  // 创建一个新的ArrayBuffer和Uint8Array视图
  let mergedBuffer = new ArrayBuffer(totalLength);
  let mergedView = new Uint8Array(mergedBuffer);

  // 将每个ArrayBuffer的内容复制到新的ArrayBuffer中
  let offset = 0;
  for (let buf of buffers) {
    mergedView.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }

  return mergedBuffer;
}

export const getContent = async ({ handle, ...options }) => {
  const blocksData = await getData({
    keyName: "parent",
    key: handle.dbkey,
    all: 1,
  });

  blocksData.sort((a, b) => a.index - b.index);

  const blocks = await Promise.all(
    blocksData.map(async (item) => {
      const data = await getData({
        storeName: "files",
        key: item.fileHash,
      });

      return data.content;
    })
  );

  switch (options.type) {
    case "file":
      const targetData = await getData({
        key: handle.dbkey,
      });

      return new File(blocks, handle.name, {
        type: targetData.fileType,
        lastModified: targetData.lastModified,
      });
    case "text":
      return blocks.map((buffer) => new TextDecoder().decode(buffer)).join("");
    case "buffer":
      return mergeArrayBuffers(blocks);
  }

  return null;
};

export const removeFile = async ({ handle }) => {
  const blocks = await getData({
    keyName: "parent",
    key: handle.dbkey,
    all: 1,
  });

  const removes = [handle.dbkey];

  blocks.forEach((item) => {
    removes.push(item.key);
  });

  setTimeout(() => {
    clearCache(blocks.map((item) => item.fileHash));
  });

  return await setData({
    removes,
  });
};

export const removeDir = async ({ handle, options }) => {
  const defaults = {
    recursive: false,
    ...options,
  };

  const blocks = await getData({
    keyName: "parent",
    key: handle.dbkey,
    all: 1,
  });

  const removes = [handle.dbkey];

  if (!blocks.length) {
    return await setData({
      removes,
    });
  }

  if (blocks.length && !defaults.recursive) {
    throw new Error(
      `The directory contains additional content, please add the recursive option`
    );
  }

  let count = 0;
  const total = blocks.length;

  for await (let item of handle.values()) {
    options.process &&
      options.process({ total, count, deleted: false, item, path: item.path });
    await item.remove({
      recursive: true,
      process: ({ path, deleted }) => {
        options.process &&
          options.process({
            total,
            count,
            item,
            deleted,
            path,
          });
      },
    });
    count++;
    options.process &&
      options.process({ total, count, deleted: true, item, path: item.path });
  }

  return await setData({
    removes,
  });
};
