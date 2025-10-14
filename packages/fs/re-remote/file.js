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
      options,
    });

    const chunkOptions = {
      remoteUser: this.#remoteUser,
      chunkSize: result.chunkSize,
      path: this.path,
    };

    const { hashes } = result;

    const chunks = [];

    console.log("hashes: ", hashes);

    // 从块模块上获取文件内容
    for (let i = 0; i < hashes.length; i++) {
      const hash = hashes[i];
      if (!hash) {
        continue;
      }

      const { chunk } = await getChunk({ hash, index: i, ...chunkOptions });

      let finalChunk = chunk;

      // 刚好处在那个范围的，读取范围数据
      if (options && (options.start || options.end)) {
        const start = options.start || 0;
        const end = options.end || result.size;

        // 计算当前块需要的范围数据
        const currentChunkStart = i * setting.chunkSize;

        const currentChunkEnd = Math.min(
          (i + 1) * setting.chunkSize,
          result.size
        );

        if (currentChunkStart < start && currentChunkEnd > start) {
          // 属于在第一个可用块内，修正范围
          finalChunk = finalChunk.slice(start - currentChunkStart);
          // debugger;
        }

        if (currentChunkStart < end && currentChunkEnd > end) {
          // 属于在最后一个可用块内
          debugger;
          // 属于在最后一个可用块内，修正范围
          finalChunk = finalChunk.slice(0, end - currentChunkStart);
        }
      }

      chunks.push(new Blob([finalChunk]));
    }

    debugger;

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
