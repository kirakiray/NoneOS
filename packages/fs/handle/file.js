import { BaseHandle } from "./base.js";
import { notify } from "../public/base.js";
import { extendFileHandle } from "../public/file.js";

export const isSafari = (() => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes("safari") && !ua.includes("chrome");
})();

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

    let file = await this._handle.getFile();
    if (options.start || options.end) {
      file = file.slice(options.start, options.end);
    }
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

  async write(data, options = {}) {
    // const isSafari = true;

    // 检查是否支持createWritable
    const hasCreateWritable =
      !!window?.FileSystemFileHandle?.prototype?.createWritable;

    if (isSafari && !hasCreateWritable) {
      return new Promise(async (resolve, reject) => {
        const worker = new Worker(import.meta.resolve("./write-worker.js"));

        worker.postMessage({
          path: this.path,
          content: data instanceof Blob ? await data.arrayBuffer() : data,
        });

        worker.onmessage = async (event) => {
          const { success, error } = event.data;

          // BUG: 这里需要一个延时，否则写入的文件会丢失
          await new Promise((resolve) => setTimeout(resolve, 1));

          if (success) {
            console.log("文件写入成功！");
            notify({
              path: this.path,
              type: "write",
              data,
              remark: options.remark,
            });
            resolve(true);
          } else {
            reject(error);
          }

          worker.terminate();
        };
      });
    }

    const handle = this._handle;
    const steam = await handle.createWritable();
    await steam.write(data);
    await steam.close();

    notify({
      path: this.path,
      type: "write",
      // data,
      remark: options.remark,
    });
  }
}

extendFileHandle(FileHandle);
