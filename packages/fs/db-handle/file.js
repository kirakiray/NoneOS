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
      file = new File([file], this.name);
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

  async write(data) {
    let finalData = data;

    if (!isSafari) {
      // 将data转换为file，file可能是不同的类型
      if (typeof data === "string" || data instanceof ArrayBuffer) {
        finalData = new File([data], this.name, {
          type: "text/plain",
        });
      }

      // 最终不是file类型，直接报错
      if (!(finalData instanceof File)) {
        throw new Error("data must be file, string or ArrayBuffer");
      }
    } else {
      // 如果是safari，就转成 arrayBuffer
      if (typeof data === "string") {
        finalData = new TextEncoder().encode(data);
      } else if (data instanceof Blob) {
        finalData = await data.arrayBuffer();
      }
    }

    const targetData = await getData({
      index: this._dbid,
    });

    // 写入文件
    targetData.file = finalData;
    await setData({ puts: [targetData] });

    notify({
      path: this.path,
      type: "write",
      data,
    });
  }
}

extendFileHandle(FileDBHandle);
