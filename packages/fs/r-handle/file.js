import { RemoteBaseHandle } from "./base.js";
import { getData, saveData } from "../../core/block/main.js";
import { readU8ByType } from "../util.js";
import { getId } from "../../core/base/pair.js";

export class RemoteFileHandle extends RemoteBaseHandle {
  constructor(options) {
    super(options);
  }

  get kind() {
    return "file";
  }

  async read(type, options) {
    // 让对面保存到cache，并得到整个文件的哈希值
    const hashs = await this.bridge({
      method: "_saveCache",
      path: this.path,
      args: [
        {
          options,
        },
      ],
    });

    // 获取对一个的块数据，并合并文件
    const u8Data = await getData({
      hashs,
      userId: this.path.split(":")[1],
    });

    return await readU8ByType({
      u8Data,
      type,
      data: { name: this.name },
      isChunk: options?.start || options?.end,
    });
  }
  async write(data) {
    const hashs = await saveData({
      data,
    });

    return await this.bridge({
      method: "_writeByCache",
      path: this.path,
      args: [{ hashs, userId: await getId() }],
    });
  }

  /**
   * 返回文件数据
   * @param {object} options 读取数据的选项
   * @returns {Promise<File>}
   */
  file(options) {
    return this.read("file", options);
  }

  /**
   * 返回文件数据
   * @param {object} options 读取数据的选项
   * @returns {Promise<Text>}
   */
  text(options) {
    return this.read("text", options);
  }

  /**
   * 返回文件数据
   * @param {object} options 读取数据的选项
   * @returns {Promise<Buffer>}
   */
  buffer(options) {
    return this.read("buffer", options);
  }

  base64(options) {
    return this.read("base64", options);
  }
}
