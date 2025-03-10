import { BaseHandle } from "./base.js";
import { notify } from "../public.js";

export class FileHandle extends BaseHandle {
  constructor(...args) {
    super(...args);
  }

  // 读取文件
  async read(options = {}) {
    // options = {
    //   type: "text",
    //   start: "",
    //   end: "",
    // };

    let file = await this.handle.getFile();
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
    const handle = this.handle;
    const steam = await handle.createWritable();
    await steam.write(data);
    await steam.close();

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
