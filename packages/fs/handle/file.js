import { BaseHandle } from "./base.js";

const writerWorkerPath = import.meta.resolve("./fs-write-worker.js");

export class FileHandle extends BaseHandle {
  constructor(...args) {
    super(...args);
  }

  // 读取文件
  async read(options) {
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
    const { path } = await this;

    const isSafari = true;

    if (isSafari) {
      return new Promise((resolve, reject) => {
        const worker = new Worker(writerWorkerPath);
        worker.postMessage({
          // fileHandle: this.handle,
          path,
          content: data,
        });
        worker.onmessage = async (event) => {
          const { success, error } = event.data;

          // BUG: 这里需要一个延时，否则写入的文件会丢失
          await new Promise((resolve) => setTimeout(resolve, 100));

          if (success) {
            console.log("文件写入成功！");
            resolve(true);
          } else {
            reject(error);
          }

          // worker.terminate();
        };
      });
    }

    const handle = this.handle;
    const steam = await handle.createWritable();
    await steam.write(data);
    await steam.close();
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
    debugger;
  }

  get lastModified() {
    return this.file.lastModified;
  }
}
