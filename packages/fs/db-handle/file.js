import { BaseDBHandle } from "./base.js";
import { notify } from "../public/base.js";
import { getData, setData } from "./db.js";

export class FileDBHandle extends BaseDBHandle {
  constructor(...args) {
    super(...args);
  }

  async read(options) {
    // options = {
    //   type: "text",
    //   start: "",
    //   end: "",
    // };
    const targetData = await getData({
      index: this._dbid,
    });

    const file = targetData.file;

    if (!file) {
      return null;
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

  async file(options) {
    return this.read({
      ...options,
      type: "file",
    });
  }

  async text(options) {
    return this.read({
      ...options,
      type: "text",
    });
  }

  async buffer(options) {
    return this.read({
      ...options,
      type: "buffer",
    });
  }

  async base64(options) {
    const file = await this.file(options);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsDataURL(file);
    });
  }

  async lastModified() {
    return (await this.file()).lastModified;
  }

  get kind() {
    return "file";
  }
}
