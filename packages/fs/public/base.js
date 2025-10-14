export class PublicBaseHandle {
  #parent;
  #root;
  constructor(options) {
    this.#parent = options.parent;
    this.#root = options.root;
  }

  get parent() {
    return this.#parent;
  }

  get root() {
    return this.#root || this;
  }

  get path() {
    if (this.parent) {
      return `${this.parent.path}/${this.name}`;
    }

    return this.name;
  }

  async copyTo(targetHandle, name) {
    const [finalTarget, finalName] = await resolveTargetAndName(
      targetHandle,
      name,
      "copy",
      this
    );

    // 如果是文件，直接复制文件内容
    if (this.kind === "file") {
      const newHandle = await finalTarget.get(finalName, {
        create: "file",
      });
      await newHandle.write(await this.file());

      return newHandle;
    }

    // 创建目标目录
    const newDir = await finalTarget.get(finalName, {
      create: "dir",
    });

    // 递归复制所有子文件和子目录
    for await (const [entryName, entry] of this.entries()) {
      await entry.copyTo(newDir, entryName);
    }

    return newDir;
  }

  async moveTo(targetHandle, name) {
    const [finalTarget, finalName] = await resolveTargetAndName(
      targetHandle,
      name,
      "move",
      this
    );

    // 如果是文件，直接移动文件
    if (this.kind === "file") {
      const newHandle = await finalTarget.get(finalName, {
        create: "file",
      });
      await newHandle.write(await this.file());
      await this.remove();
      return newHandle;
    }

    // 如果是目录，先创建新目录
    const newDir = await finalTarget.get(finalName, {
      create: "dir",
    });

    // 递归移动所有子文件和子目录
    for await (const [entryName, entry] of this.entries()) {
      await entry.moveTo(newDir, entryName);
    }

    // 删除原目录
    await this.remove();

    return newDir;
  }

  toJSON() {
    return {
      name: this.name,
      path: this.path,
      kind: this.kind,
    };
  }

  // 监听文件系统变化
  async observe(func) {
    const obj = {
      func,
      handle: this,
    };

    observers.add(obj);

    return () => {
      observers.delete(obj);
    };
  }
}

// 监听文件系统变化
const castChannel = new BroadcastChannel("nonefs-system-handle-change");
castChannel.onmessage = (event) => {
  // 通知所有的观察者
  notify(
    {
      ...event.data,
    },
    true
  );
};

// 观察者集合
const observers = new Set();

// 文件发生变动，就除法这个方法，通知所有的观察者
export const notify = ({ path, ...others }, isCast) => {
  if (!isCast) {
    // 通知其他标签页的文件系统变化
    castChannel.postMessage({
      path,
      ...others,
    });
  }

  observers.forEach((observer) => {
    // 只通知当前目录下或文件的观察者
    if (path.includes(observer.handle.path)) {
      observer.func({
        path,
        ...others,
      });
    }
  });
};

// 处理目标路径和文件名
const resolveTargetAndName = async (targetHandle, name, methodName, self) => {
  // 处理第一个参数为字符串的情况
  let finalTarget = targetHandle;
  let finalName = name;

  if (typeof targetHandle === "string") {
    finalName = targetHandle;
    finalTarget = self.parent;
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
