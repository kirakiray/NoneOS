import { PublicBaseHandle } from "../public.js";

export class BaseHandle extends PublicBaseHandle {
  // 对OPFS进行封装
  #originHandle = null;
  constructor(dirHandle, options = {}) {
    super(options);
    this.#originHandle = dirHandle;
  }

  get handle() {
    return this.#originHandle;
  }

  get name() {
    return this.#originHandle.name;
  }

  async isSame(target) {
    return this.#originHandle.isSameEntry(target.handle);
  }

  async remove() {
    const parent = this.parent;

    // 最后删除当前目录或文件
    await parent.#originHandle.removeEntry(this.#originHandle.name, {
      recursive: true,
    });

    notify({
      path: this.path,
      type: "remove",
    });
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
