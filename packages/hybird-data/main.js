const Stanz = $.Stanz;
const nextTick = $.nextTick;

const DATAID = Symbol("data_id");
const SELFHANDLE = Symbol("self_handle");

const getRandomId = () => Math.random().toString(36).slice(2);

export class HybirdData extends Stanz {
  constructor(arg1) {
    super({
      dataStatus: "preparing",
    });

    if (arg1._mark === "db") {
      this._initByHandle(arg1);
    } else {
      this._initData({ ...arg1 });

      nextTick(async () => {
        // 添加自身handle
        const { owner } = this;

        if (owner.size === 1) {
          const parentHandle = Array.from(owner)[0][SELFHANDLE];

          this[SELFHANDLE] = await parentHandle.get(this._dataid, {
            create: "dir",
          });

          this.dataStatus = "ok";
        } else {
          // 出现情况，找不到对应的 dir handle
          debugger;
        }
      });
    }
  }

  // 使用handle进行初始化
  async _initByHandle(handle) {
    let wid;

    Object.defineProperties(this, {
      // 停止监听
      disconnect: {
        value: () => this.unwatch(wid),
      },
    });

    // 设置自身 handle
    this[SELFHANDLE] = handle;

    const dFileHandle = await handle.get("_d", {
      create: "file",
    });

    const text = await dFileHandle.text();

    if (text) {
      const data = JSON.parse(text);

      debugger;

      await this._initData(data, "handle");
    }

    wid = this.watchTick((watchers) => {
      // 判断是否有自身的变动，有的话就直接更新文件
      const hasChange = watchers.some((e) => !e.path.length);

      if (hasChange) {
        // 更新自身
        updateDataHandle(this);
      }

      // 根据变动存储其他的对象
      watchers.forEach((watchOpt) => {
        if (watchOpt.path && watchOpt.name !== "dataStatus") {
          // 子对象数据变动
          debugger;
        }
      });
    });

    this.dataStatus = "ok";
  }

  async _initData(data) {
    if (data.dataStatus) {
      const err = new Error("dataStatus is a reserved key");
      console.warn(err, data);
      throw err;
    }

    if (data._id) {
      this[DATAID] = data._id;
      delete data._id;
    } else {
      this[DATAID] = getRandomId();
    }

    Object.assign(this, data);

    this.dataStatus = "loaded";
  }

  get __OriginStanz() {
    return HybirdData;
  }

  get _dataid() {
    return this[DATAID];
  }
}

const updateDataHandle = async (hydata) => {
  const obj = {
    length: hydata.length,
  };

  for (let [key, value] of Object.entries(hydata)) {
    // 如果是对象类型，写入到新的文件夹内
    if (typeof value === "object") {
      obj[key] = `___dataid___${value._dataid}`;
      continue;
    }

    obj[key] = value;
  }

  const dFile = await hydata[SELFHANDLE].get("_d", {
    create: "file",
  });

  await dFile.write(JSON.stringify(obj));

  console.log("obj: ", obj);
};
