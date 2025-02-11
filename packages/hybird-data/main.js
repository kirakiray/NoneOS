const Stanz = $.Stanz;

const DATAID = Symbol("data_id");

export class HybirdData extends Stanz {
  constructor(arg1) {
    super({
      dataStatus: "preparing",
    });
    // this[DATAID] = Math.random().toString(36).slice(2);

    if (arg1._mark === "db") {
      this._init(arg1);
    } else {
      const data = { ...arg1 };

      if (data.dataStatus) {
        const err = new Error("dataStatus is a reserved key");
        console.warn(err, data);
        throw err;
      }

      if (data._id) {
        this[DATAID] = data._id;
        delete data._id;
      } else {
        this[DATAID] = Math.random().toString(36).slice(2);
      }

      Object.assign(this, data);

      this.dataStatus = "ok";
    }
  }

  async _init(handle) {
    let wid;

    Object.defineProperties(this, {
      // 停止监听
      disconnect: {
        value: () => this.unwatch(wid),
      },
    });

    const dFileHandle = await handle.get("_d", {
      create: "file",
    });

    const text = await dFileHandle.text();

    if (text) {
      const data = JSON.parse(text);

      const { _id } = data;

      if (_id) {
        this[DATAID] = _id;
        delete data._id;
      } else {
        this[DATAID] = Math.random().toString(36).slice(2);
      }

      // 初始化数据
      Object.assign(this, data);
    }

    this.dataStatus = "ok";

    wid = this.watchTick((watchers) => {
      dataWatchEnd(watchers, this, dFileHandle);
    });
  }

  get __OriginStanz() {
    return HybirdData;
  }

  get _dataid() {
    return this[DATAID];
  }
}

const dataWatchEnd = async (watchers, xdata, dFileHandle) => {
  let changedSelf = false; // 是否执行过一次自身的变动

  for (let e of watchers) {
    if (e.path.length === 0) {
      if (e.type === "set") {
        // 自身对应key的value变动
        if (!changedSelf) {
          // 保存一次自身变动
          changedSelf = 1;

          const realData = getDataObject(xdata);

          await dFileHandle.write(JSON.stringify(realData));
        }
      } else {
        // 自身的数组操作
        debugger;
      }
    } else {
      // TODO: 子对象的数据变动
      debugger;
    }
  }

  console.log("watchers", watchers);
};

// 去除所有非必要字段后的数据
const getDataObject = (xdata) => {
  const realData = {
    _id: xdata._dataid,
  };

  for (let [key, value] of Object.entries(xdata)) {
    // 对非数字和隐藏的key进行保存
    if (/\D/.test(key) && !/^_/.test(key) && key !== "dataStatus") {
      if (typeof value === "object") {
        realData[key] = getDataObject(value);
      } else {
        realData[key] = value;
      }
    }
  }

  return realData;
};
