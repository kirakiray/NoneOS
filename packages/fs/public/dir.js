class PublicDirHandle {
  async _getByMultiPath(name, options) {
    const { create } = options || {};

    const names = name.split("/");
    let handle = this;
    while (names.length) {
      const name = names.shift();
      let innerCreate;
      if (create) {
        if (names.length) {
          innerCreate = "dir";
        } else {
          innerCreate = create;
        }
      }
      handle = await handle.get(name, {
        create: innerCreate,
      });
    }

    return handle;
  }

  async *entries() {
    for await (let key of this.keys()) {
      const handle = await this.get(key);
      yield [key, handle];
    }
  }

  async *values() {
    for await (let [key, value] of this.entries()) {
      yield value;
    }
  }

  async some(callback) {
    // 遍历目录，如果回调返回true则提前退出
    for await (let [key, value] of this.entries()) {
      const result = await callback(value, key, this);
      if (result) {
        break;
      }
    }
  }

  // 扁平化获取所有的子文件（包括多级子孙代）
  async flat() {
    const result = [];
    // 遍历当前目录下的所有文件和文件夹
    for await (const [name, handle] of this.entries()) {
      // 只有非目录类型才加入结果数组
      if (handle.kind !== "dir") {
        result.push(handle);
      } else {
        // 如果是文件夹，只获取其子文件
        const children = await handle.flat();
        result.push(...children);
      }
    }
    return result;
  }

  get kind() {
    return "dir";
  }
}

// 扩展 DirHandle 的方法
export const extendDirHandle = async (DirHandle) => {
  const propDescs = Object.getOwnPropertyDescriptors(PublicDirHandle.prototype);
  delete propDescs.constructor;

  Object.defineProperties(DirHandle.prototype, propDescs);
};
