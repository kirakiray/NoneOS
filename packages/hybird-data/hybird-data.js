import { Stanz } from "../libs/stanz/main.js";
import {
  saveData,
  reservedKeys,
  getRandomId,
  Identification,
} from "./public.js";

export class HybirdData extends Stanz {
  #dataId;
  #root;
  #rootSpaceHandle = null;
  #rootMapper = null;
  constructor(data, options) {
    super({
      dataStatus: "preparing",
    });

    if (!options) {
      // stanz删除时的错误初始化
      return;
    }

    if (options._dataId) {
      // 从本地handle加载的数据，会带有数据的id
      const { owner } = options;

      this.#root = owner.#root || owner;
      this.#dataId = options._dataId; // 继承旧的id
      this.#root.#rootMapper.set(this.#dataId, this); // 将数据添加到root对象中

      // 初始化设置数据
      this.#initData(data).then((e) => (this.dataStatus = "ok"));
    } else if (options.owner) {
      // 新的数据，没有对应的fileHandle，需要生成
      const { owner } = options;

      this.#root = owner.#root || owner;
      this.#dataId = getRandomId(); // 随机生成一个id
      this.#root.#rootMapper.set(this.#dataId, this); // 将数据添加到root对象中

      // 合并数据
      Object.assign(this, data);

      // 标识自己的新对象
      this.__newHy = true;

      this.dataStatus = "ok";
    } else if (options.handle) {
      // 从文件夹中获取数据，代表是root对象
      this.#rootSpaceHandle = options.handle;
      this.#dataId = "_root";
      this.#rootMapper = new Map();

      this.#initRoot();
    } else {
      // TODO: 不明白的情况
      debugger;
    }
  }

  // 初始化根对象的
  async #initRoot() {
    let handle = await this._spaceHandle.get(this.#dataId, {
      create: "file",
    });

    const text = await handle.text();

    if (text) {
      // 初始化设置数据
      const data = JSON.parse(text);

      await this.#initData(data); // 初始化数据，包括递归初始化子对象，以及设置value
    }

    const cancel = this._spaceHandle.observe((e) => {
      if (e.type !== "write") {
        // 不是写入事件
        return;
      }

      // 监听文件变化从而实时更新数据
      if (e.remark && this._root.xid === e.remark.replace("writedby-", "")) {
        return;
      }

      // 通过修改handle的数据重新刷新数据
      const modifyDataId = e.path.replace(/.+\//, "");
      let targetData = this._rootMapper.get(modifyDataId);

      if (modifyDataId === "_root") {
        targetData = this._root;
      }

      targetData && targetData.reload(); // 从handle中重新加载数据
    });

    const wid = this.watchTick((watchs) => {
      // 过滤掉非set操作
      const reWatchs = Array.from(watchs).filter(
        (e) =>
          (e.type === "set" && !reservedKeys.includes(e.name)) ||
          e.type === "array"
      );

      if (!reWatchs.length) {
        return;
      }

      watchs.forEach((watcher) => {
        saveData(watcher.target); // 保存数据
      });
    });

    Object.defineProperties(this, {
      // 注销监听
      disconnect: {
        value() {
          this.unwatch(wid);
          cancel();
          this.revoke(); // 彻底销毁数据
        },
      },
    });

    // 根节点初始化完成
    this.dataStatus = "ok";
  }

  // 根据本地的data，进行初始化数据；会将子对象进行初始化
  async #initData(data) {
    // 初始化不触发watch
    this.__unupdate = 1;
    await Promise.all(
      Object.entries(data).map(([key, value]) => this.#setData(key, value))
    );
    delete this.__unupdate;
  }

  async #setData(key, value) {
    if (reservedKeys.includes(key)) {
      return;
    }

    const rootMapper = this._rootMapper;

    if (typeof value === "string" && value.startsWith(Identification)) {
      const dataId = value.replace(Identification, "");

      // 查看是否已经存在
      const exited = rootMapper.get(dataId);
      if (exited) {
        if (exited === this[key]) {
          return;
        }

        this[key] = exited;
        return;
      }

      // 读取本地的handle文件
      const subHandle = await this._spaceHandle.get(dataId);

      if (!subHandle) {
        // 没有找到对应的handle文件
        return;
      }

      const subText = await subHandle.text();
      const subData = JSON.parse(subText);

      const subHyData = new HybirdData(subData, {
        _dataId: dataId,
        owner: this,
      });

      this[key] = subHyData; // 设置数据，这里会触发set，从而触发保存数据的逻辑
      return;
    }

    if (this[key] !== value) {
      this[key] = value;
    }
  }

  async reload() {
    this.dataStatus = "preparing";

    const handle = await this._spaceHandle.get(this.#dataId);

    if (!handle) {
      // 没有找到对应的handle文件
      console.warn("Data has been deleted", this);
      // this.revoke();
      return;
    }

    const text = await handle.text();
    if (!text) {
      // 没有找到对应的handle文件
      console.warn("Data has been deleted", this);
      return;
    }

    const data = JSON.parse(text);

    // 根据对象数据进行修正
    await Promise.all(
      Object.entries(data).map(([key, value]) => this.#setData(key, value))
    );

    // 处理删除的情况
    const allKeys = Object.keys(this);
    const exitedKeys = Object.keys(data);
    const deleteKeys = allKeys.filter(
      (e) => !exitedKeys.includes(e) && !reservedKeys.includes(e)
    );

    if (deleteKeys.length) {
      deleteKeys.forEach((e) => delete this[e]);
    }

    this.dataStatus = "ok";
  }

  // 确认当前对象已经初始化完成
  async ready(isReadyAll) {
    if (this.dataStatus !== "ok") {
      await this.watchUntil(() => this.dataStatus === "ok", 3000);
    }

    if (isReadyAll) {
      // 监听所有子级对象
      await Promise.all(
        Object.values(this).map(async (value) => {
          if (value instanceof HybirdData) {
            await value.ready(true);
          }
        })
      );
    }

    return true;
  }

  get __OriginStanz() {
    return HybirdData;
  }

  get _root() {
    return this.#root || this;
  }

  get _rootMapper() {
    return this._root.#rootMapper;
  }

  get _dataId() {
    return this.#dataId;
  }

  get _spaceHandle() {
    return this.#rootSpaceHandle || this.#root.#rootSpaceHandle;
  }

  toJSON() {
    const obj = {};

    Object.entries(this).forEach(([key, value]) => {
      if (reservedKeys.includes(key)) {
        return;
      }

      if (value instanceof HybirdData) {
        obj[key] = value.toJSON(); // 递归处理子对象
        return;
      }

      obj[key] = value;
    });

    return obj;
  }
}
