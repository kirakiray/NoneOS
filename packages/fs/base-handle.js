import { splitIntoChunks, calculateHash, flatHandle } from "./util.js";
import { CHUNK_REMOTE_SIZE } from "./util.js";
import { fetchCache, saveCache } from "./cache/main.js";

export class PublicBaseHandle {
  constructor() {}

  // 扁平化文件数据
  async flat() {
    return flatHandle(this);
  }

  // 按照需求将文件保存到缓存池中，方便远端获取
  async _saveCache(arg) {
    const chunkSize = arg.size;
    const { options, returnHashs } = arg;

    // 获取指定的块内容
    const result = await this.buffer(options);
    const datas = await splitIntoChunks(result, chunkSize);

    const hashs = [];

    await Promise.all(
      datas.map(async (chunk, i) => {
        const hash = await calculateHash(chunk);

        hashs[i] = hash;

        await saveCache(hash, chunk);
      })
    );

    if (returnHashs) {
      return hashs;
    }

    return true;
  }

  // 从缓冲池进行组装文件并写入
  async _writeByCache(options) {
    const { hashs } = options;

    const userId = this.path.replace(/^\$remote:(.+):.+\/.+/, "$1");

    const chunks = await Promise.all(
      hashs.map(async (hash) => {
        return fetchCache(hash, userId);
      })
    );

    // 写入文件
    const writer = await this.createWritable();

    for (let chunk of chunks) {
      await writer.write(chunk);
    }

    writer.close();

    return true;
  }

  async _getHashs(options) {
    options = options || {};
    const chunkSize = options.size || CHUNK_REMOTE_SIZE;

    // 获取指定的块内容
    const result = await this.buffer();

    const datas = await splitIntoChunks(result, chunkSize);

    const hashs = await Promise.all(
      datas.map(async (chunk) => {
        return await calculateHash(chunk);
      })
    );

    return hashs;
  }

  // 根据哈希值，从缓存目录获取块数据，再合并成一个完整的文件
  async _mergeChunk(hashs, cacheDirPath) {
    const cacheDir = await (await this.root()).get(cacheDirPath);

    if (!cacheDir) {
      throw new Error("没有找到缓冲目录");
    }

    const writer = await this.createWritable();

    for (let hash of hashs) {
      const handle = await cacheDir.get(hash);
      if (!handle) {
        const err = get("notFoundChunk", {
          path: item.path,
          hash,
        });
        console.error(err);
        await writer.abort();
        throw err;
      }

      const data = await handle.buffer();
      await writer.write(data);
    }

    // 没有报错
    await writer.close();

    return true;
  }
}
