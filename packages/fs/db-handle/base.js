// 对 IndexedDB 进行封装
export class BaseDBHandle {
  #name;
  #parent;
  #root;
  #db;

  constructor(name, options = {}) {
    this.#name = name;
    this.#root = options.root;
    this.#parent = options.parent;
    this.#db = options.db;
  }

  get _db() {
    return this.#db;
  }

  get name() {
    return this.#name;
  }

  get path() {
    if (this.#parent) {
      return `${this.#parent.path}/${this.#name}`;
    }
    return this.#name;
  }

  async size() {
    if (this.kind === "file") {
      const content = await this.read();
      return content.length;
    }
    return null;
  }

  async isSame(target) {
    return this.path === target.path;
  }

  async parent() {
    return this.#parent;
  }

  async root() {
    return this.#root || this;
  }

  async remove() {
    const tx = this.#db.transaction(["files", "directories"], "readwrite");
    const filesStore = tx.objectStore("files");
    const dirsStore = tx.objectStore("directories");

    // 如果是文件，直接删除
    if (this.kind === "file") {
      await filesStore.delete(this.path);
      return;
    }

    // 如果是目录，需要递归删除所有子文件和子目录
    const range = IDBKeyRange.bound(this.path + "/", this.path + "/\uffff");

    // 删除所有子文件
    const filesCursor = await filesStore.openCursor(range);
    while (filesCursor) {
      await filesCursor.delete();
      await filesCursor.continue();
    }

    // 删除所有子目录
    const dirsCursor = await dirsStore.openCursor(range);
    while (dirsCursor) {
      await dirsCursor.delete();
      await dirsCursor.continue();
    }

    // 删除当前目录
    await dirsStore.delete(this.path);
  }

  async copyTo(targetHandle, name) {
    const [finalTarget, finalName] = await this.#resolveTargetAndName(
      targetHandle,
      name,
      "copy"
    );

    // 如果是文件，直接复制文件内容
    if (this.kind === "file") {
      const content = await this.read();
      const newHandle = await finalTarget.get(finalName, { create: "file" });
      await newHandle.write(content);
      return newHandle;
    }

    // 创建目标目录
    const newDir = await finalTarget.get(finalName, { create: "dir" });

    // 递归复制所有子文件和子目录
    for await (const [entryName, entry] of this.entries()) {
      await entry.copyTo(newDir, entryName);
    }

    return newDir;
  }

  async moveTo(targetHandle, name) {
    const [finalTarget, finalName] = await this.#resolveTargetAndName(
      targetHandle,
      name,
      "move"
    );

    // 如果是文件，直接移动文件
    if (this.kind === "file") {
      const content = await this.read();
      const newHandle = await finalTarget.get(finalName, { create: "file" });
      await newHandle.write(content);
      await this.remove();
      return newHandle;
    }

    // 如果是目录，先创建新目录
    const newDir = await finalTarget.get(finalName, { create: "dir" });

    // 递归移动所有子文件和子目录
    for await (const [entryName, entry] of this.entries()) {
      await entry.moveTo(newDir, entryName);
    }

    // 删除原目录
    await this.remove();

    return newDir;
  }

  async #resolveTargetAndName(targetHandle, name, methodName) {
    // 处理第一个参数为字符串的情况
    let finalTarget = targetHandle;
    let finalName = name;

    if (typeof targetHandle === "string") {
      finalName = targetHandle;
      finalTarget = await this.parent();
    }

    // 如果目标句柄和当前句柄相同，则不需要移动
    if (await this.isSame(finalTarget)) {
      return this;
    }

    // 检查目标路径是否为当前路径的子目录
    const targetPath = finalTarget.path;
    const currentPath = this.path;
    if (targetPath.startsWith(currentPath + "/")) {
      throw new Error(`Cannot ${methodName} a directory into its subdirectory`);
    }

    // 获取目标文件名，如果没有提供则使用原文件名
    finalName = finalName || this.name;

    return [finalTarget, finalName];
  }
}
