import { BaseDBHandle } from "./base.js";

// 文件句柄类
export class FileDBHandle extends BaseDBHandle {
  constructor(...args) {
    super(...args);
  }

  // 读取文件内容
  async read(options = {}) {
    const tx = this._db.transaction(["files"], "readonly");
    const store = tx.objectStore("files");
    const request = store.get(this.path);

    const file = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (!file) {
      throw new Error(`File ${this.path} not found`);
    }

    const content = file.content;
    if (options.start || options.end) {
      return content.slice(options.start, options.end);
    }

    switch (options.type) {
      case "text":
        return content;
      case "buffer":
        return new TextEncoder().encode(content);
      default:
        return content;
    }
  }

  // 写入文件内容
  async write(data) {
    const tx = this._db.transaction(["files"], "readwrite");
    const store = tx.objectStore("files");

    let content = data;
    if (data instanceof Blob || data instanceof File) {
      content = await data.text();
    } else if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
      content = new TextDecoder().decode(data);
    }

    await store.put({
      path: this.path,
      content,
      lastModified: Date.now(),
    });
  }

  // 获取文件内容
  async text(options) {
    return this.read({
      ...options,
      type: "text",
    });
  }

  // 获取文件内容为 ArrayBuffer
  async buffer(options) {
    return this.read({
      ...options,
      type: "buffer",
    });
  }

  // 获取文件内容为 Base64
  async base64(options) {
    const buffer = await this.buffer(options);
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }

  // 获取文件最后修改时间
  async lastModified() {
    const tx = this._db.transaction(["files"], "readonly");
    const store = tx.objectStore("files");
    const file = await store.get(this.path);
    return file ? file.lastModified : null;
  }

  get kind() {
    return "file";
  }
}
