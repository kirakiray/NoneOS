import { RemoteBaseHandle, agentData } from "./base.js";
import { extendFileHandle } from "../public/file.js";
import { getChunk, saveChunk } from "../../chunk/main.js";
import { getHash } from "../../fs/util.js";

export const setting = {
  chunkSize: 255 * 1024, // 发送给对方的粉块大小，不能大于255kb
};

export class RemoteFileHandle extends RemoteBaseHandle {
  #remoteUser;

  constructor(options) {
    super(options);
    this.#remoteUser = options.remoteUser;
  }

  // 读取文件
  async read(options) {
    // 获取块信息后，在通过block模块进行组装内容
    const result = await agentData(this.#remoteUser, {
      name: "get-file-hash",
      path: this.path,
      // options,
    });

    const chunkOptions = {
      remoteUser: this.#remoteUser,
      chunkSize: result.chunkSize,
      path: this.path,
    };

    const { hashes } = result;

    const chunks = [];

    console.log("hashes: ", hashes);

    if (!options || (!options.start && !options.end)) {
      for (let i = 0; i < hashes.length; i++) {
        const hash = hashes[i];
        const { chunk } = await getChunk({ hash, index: i, ...chunkOptions });
        chunks.push(chunk);
      }
    } else {
      // 刚好处在那个范围的，读取范围数据
      const start = options.start || 0;
      const end = options.end || result.size;

      // 从块模块上获取文件内容
      for (let i = 0; i < hashes.length; i++) {
        const hash = hashes[i];

        // 计算当前块需要的范围数据
        const currentChunkStart = i * result.chunkSize;

        const currentChunkEnd = Math.min(
          (i + 1) * result.chunkSize,
          result.size
        );

        let finalChunk = null;

        const run = async () => {
          const result = await getChunk({ hash, index: i, ...chunkOptions });
          finalChunk = result.chunk;
        };

        let inRange = false;

        if (currentChunkStart >= start && currentChunkEnd <= end) {
          // 属于在中间块内，不需要修正
          inRange = true;
          await run();
        } else {
          // 在边缘块上或不在范围内
          if (currentChunkStart < start && currentChunkEnd > start) {
            // 属于在第一个可用块内，修正范围
            await run();
            finalChunk = finalChunk.slice(start - currentChunkStart);
            inRange = true;
          }

          if (currentChunkStart < end && currentChunkEnd > end) {
            // 属于在最后一个可用块内，修正范围
            await run();
            finalChunk = finalChunk.slice(0, end - currentChunkStart);
            inRange = true;
          }
        }

        if (inRange) {
          chunks.push(new Blob([finalChunk]));
        }
      }
    }

    const fileName = this.path.split("/").pop();

    const file = new File(chunks, fileName, {
      type: result.type,
      lastModified: result.lastModified,
    });

    switch (options.type) {
      case "file":
        return file;
      case "buffer":
        return file.arrayBuffer();
      case "text":
      default:
        return file.text();
    }
  }

  // 写入内容
  async write(data) {
    const blob = new Blob([data]);

    // 将文件分片，并写入到缓存中
    const chunkSize = setting.chunkSize;
    const chunkCount = Math.ceil(blob.size / chunkSize);

    const hashes = [];

    for (let i = 0; i < chunkCount; i++) {
      const start = i * chunkSize;
      const end = start + chunkSize;
      const chunk = blob.slice(start, end);

      const hash = await getHash(chunk);

      // 先保存块到本地缓存，并记录hash
      await saveChunk({
        hash,
        chunk,
        userDirName: this.#remoteUser.self.dirName,
      });

      hashes.push(hash);
    }

    // 发送给对方去写入
    const result = await agentData(this.#remoteUser, {
      name: "write-file-chunk",
      path: this.path,
      hashes,
    });

    return result;
  }

  async lastModified() {
    return agentData(this.#remoteUser, {
      name: "lastModified",
      path: this.path,
    });
  }
}

extendFileHandle(RemoteFileHandle);
