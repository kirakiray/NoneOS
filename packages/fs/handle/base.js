// 对OPFS进行封装
export class BaseHandle {
  #originHandle = null;
  #parent;
  #root;
  constructor(dirHandle, options = {}) {
    this.#originHandle = dirHandle;
    this.#root = options.root;
    this.#parent = options.parent;
  }

  get handle() {
    return this.#originHandle;
  }

  get name() {
    return this.#originHandle.name;
  }

  get path() {
    if (this.#parent) {
      return `${this.#parent.path}/${this.#originHandle.name}`;
    }

    return this.#originHandle.name;
  }

  async size() {
    if (this.kind === "file") {
      const file = await this.file();
      return file.size;
    }

    return null;
  }

  async isSame(target) {
    return this.#originHandle.isSameEntry(target.handle);
  }

  async parent() {
    return this.#parent;
  }

  async root() {
    return this.#root || this;
  }

  async remove() {
    const parent = await this.parent();

    // 最后删除当前目录或文件
    await parent.#originHandle.removeEntry(this.#originHandle.name, {
      recursive: true,
    });
  }

  async moveTo(targetHandle, name) {
    const [finalTarget, finalName] = await resolveTargetAndName(
      targetHandle,
      name,
      "move",
      this
    );
  }

  async copyTo(targetHandle, name) {
    const [finalTarget, finalName] = await resolveTargetAndName(
      targetHandle,
      name,
      "copy",
      this
    );
  }
}

const resolveTargetAndName = async (targetHandle, name, methodName, self) => {
  // 处理第一个参数为字符串的情况
  let finalTarget = targetHandle;
  let finalName = name;

  if (typeof targetHandle === "string") {
    finalName = targetHandle;
    finalTarget = await self.parent();
  }
  // 如果目标句柄和当前句柄相同，则不需要移动
  if (await self.isSame(finalTarget)) {
    return self;
  }

  // 检查目标路径是否为当前路径的子目录
  const targetPath = finalTarget.path;
  const currentPath = self.path;
  if (targetPath.startsWith(currentPath + "/")) {
    throw new Error(`Cannot ${methodName} a directory into its subdirectory`);
  }

  // 获取目标文件名，如果没有提供则使用原文件名
  finalName = finalName || self.name;

  return [finalTarget, finalName];
};
