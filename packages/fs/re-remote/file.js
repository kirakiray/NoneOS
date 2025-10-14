import { RemoteBaseHandle, agentData } from "./base.js";
import { extendFileHandle } from "../public/file.js";
import { getChunk, saveChunk } from "../../chunk/main.js";
import { getHash } from "../../fs/util.js";

export const setting = {
  chunkSize: 255 * 1024, // 发送给对方的分块大小，不能大于255kb
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
      path: this._path,
      options,
    });

    const chunkOptions = {
      remoteUser: this.#remoteUser,
      chunkSize: result.chunkSize,
      path: this._path,
    };

    const { hashes } = result;

    const chunks = [];

    // console.log("hashes: ", hashes);

    if (!options || (!options.start && !options.end)) {
      for (let i = 0; i < hashes.length; i++) {
        const hash = hashes[i];
        const { chunk } = await getChunk({ hash, index: i, ...chunkOptions });
        chunks.push(chunk);
      }
    } else {
      // 刚好处在那个范围的，读取范围数据
      const start = options.start || 0;
      const end = options.end
        ? Math.min(options.end, result.size)
        : result.size;

      // 从块模块上获取文件内容
      for (let chunkIndex = 0; chunkIndex < hashes.length; chunkIndex++) {
        const chunkHash = hashes[chunkIndex];

        const currentChunkStart = chunkIndex * result.chunkSize;
        const currentChunkEnd = Math.min(
          (chunkIndex + 1) * result.chunkSize,
          result.size
        );

        // 符合范围的块才进行获取
        if (currentChunkEnd < start || currentChunkStart > end) {
          continue;
        }

        const { chunk } = await getChunk({
          hash: chunkHash,
          index: chunkIndex,
          ...chunkOptions,
        });

        let processedChunk = chunk;
        let isStartTrimmed = false;

        if (currentChunkStart < start) {
          processedChunk = processedChunk.slice(start - currentChunkStart);
          isStartTrimmed = true;
        }

        if (currentChunkEnd > end) {
          if (isStartTrimmed) {
            processedChunk = processedChunk.slice(0, end - start);
          } else {
            processedChunk = processedChunk.slice(0, end - currentChunkStart);
          }
        }

        chunks.push(processedChunk);
      }
    }
    const fileName = this._path.split("/").pop();

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
      path: this._path,
      hashes,
    });

    return result;
  }

  async lastModified() {
    return agentData(this.#remoteUser, {
      name: "lastModified",
      path: this._path,
    });
  }

  async size() {
    return await agentData(this.#remoteUser, {
      name: "size",
      path: this._path,
    });
  }
}

extendFileHandle(RemoteFileHandle);
