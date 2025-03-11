import { BaseDBHandle } from "./base.js";
import { notify } from "../public/base.js";
import { extendFileHandle } from "../public/file.js";
import { getData, setData } from "./db.js";
import { isSafari } from "../util.js";

export class FileDBHandle extends BaseDBHandle {
  constructor(...args) {
    super(...args);
  }

  async read(options = {}) {
    // options = {
    //   type: "text",
    //   start: "",
    //   end: "",
    // };
    const targetData = await getData({
      index: this._dbid,
    });

    let file = targetData.file;

    if (!file) {
      return null;
    }

    if (isSafari) {
      // safari存储的是 arrayBuffer，需要转成file
      if (targetData.fileInfo) {
        file = new File([file], this.name, targetData.fileInfo);
      } else {
        file = new File([file], this.name);
      }
    }

    if (options.start || options.end) {
      file = file.slice(options.start, options.end);
    }

    switch (options.type) {
      case "file":
        return file;
      case "text":
        return file.text();
      case "buffer":
        return file.arrayBuffer();
      default:
        return file.text();
    }
  }

  async write(data, options = {}) {
    let finalData = data;

    if (!isSafari) {
      // 将data转换为file，file可能是不同的类型
      if (
        typeof data === "string" ||
        data instanceof ArrayBuffer ||
        data instanceof Uint8Array
      ) {
        finalData = new File([data], this.name, {
          type: "text/plain",
        });
      }

      // 最终不是file类型，直接报错
      if (!(finalData instanceof File)) {
        throw new Error("data must be file, string, Uint8Array or ArrayBuffer");
      }
    } else {
      // 如果是safari，就转成 arrayBuffer
      if (typeof data === "string") {
        finalData = new TextEncoder().encode(data);
      } else if (data instanceof Blob) {
        finalData = await data.arrayBuffer();
      }

      // 如果不是arrayBuffer，直接报错
      if (
        !(finalData instanceof Uint8Array || finalData instanceof ArrayBuffer)
      ) {
        throw new Error("data must be file, string, Uint8Array or ArrayBuffer");
      }
    }

    const targetData = await getData({
      index: this._dbid,
    });

    if (isSafari) {
      // 带上原始文件信息
      if (data instanceof File) {
        targetData.fileInfo = {
          type: data.type,
          lastModified: data.lastModified,
        };
      }
    }

    // 写入文件
    targetData.file = finalData;
    await setData({ puts: [targetData] });

    notify({
      path: this.path,
      type: "write",
      data,
      remark: options.remark,
    });
  }
}

extendFileHandle(FileDBHandle);
