import { flatHandle } from "./util.js";
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
    const data = await this.buffer(options);

    return await saveData({ data });
  }

  // 从缓存区获取数据并写入
  async _writeByCache({ hashs, userId }) {
    const data = await getData({ hashs, userId });

    return await this.write(data);
  }
}
