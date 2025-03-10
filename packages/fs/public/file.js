class PublicFileHandle {
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

// 扩展 FileHandle 的方法
export const extendFileHandle = async (FileHandle) => {
  const propDescs = Object.getOwnPropertyDescriptors(
    PublicFileHandle.prototype
  );
  delete propDescs.constructor;

  Object.defineProperties(FileHandle.prototype, propDescs);
};
