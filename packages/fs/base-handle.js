import { calculateHash, CHUNK_SIZE, flatHandle, getHashs } from "./util.js";
import { saveData, getData } from "../core/block/main.js";

export class PublicBaseHandle {
  constructor() {}

  // 扁平化文件数据
  async flat() {
    return flatHandle(this);
  }

  // 按照需求将文件保存到缓存池中，方便远端获取
  async _saveCache({ options }) {
    // 获取指定的块内容
    const data = await this.file(options);

    return await saveData({
      data,
      reason: "save-cache",
      path: this.path,
      userId: this.__remote_user,
    });
  }

  // 从缓存区获取数据并写入
  async _writeByCache({ hashs, userId }) {
    const data = await getData({
      hashs,
      userId,
      path: this.path,
      reason: "remote-write-cache",
    });

    return await this.write(data);
  }

  // 获取文件哈希值的方法
  async hash() {
    if (this.kind === "dir") {
      throw new Error(`The directory cannot use the hash method`);
    }
    const hashs = await this._getHashs();

    const hash = await calculateHash(hashs.join(""));

    return hash;
  }

  // 获取1mb分区哈希块数组
  async _getHashs(options) {
    const chunkSize = options?.chunkSize || CHUNK_SIZE;

    if (this.kind === "file") {
      return getHashs(await this._fsh.getFile(), chunkSize);
    }

    // 能进入这里，肯定是dir的类型
    // 扁平文件数据
    const flatdata = await this.flat();

    // 获取所有hash
    return await Promise.all(
      flatdata.map(async (item) => {
        const hashs = await item.handle._getHashs();

        return [item.path, hashs];
      })
    );
  }
}
