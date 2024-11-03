import { RemoteBaseHandle } from "./base.js";
import { getData } from "../../core/block/main.js";
import { readBufferByType } from "../util.js";

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
    const buffer = await getData({
      hashs,
      userId: this.path.split(":")[1],
    });

    return await readBufferByType({
      buffer,
      type,
      data: { name: this.name },
      isChunk: options?.start || options?.end,
    });
  }
  async write(...args) {
    const result = await this.bridge({
      method: "write",
      path: this.path,
      args,
    });

    return result;
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
