const Stanz = $.Stanz;
const nextTick = $.nextTick;

const DATAID = Symbol("data_id");
const SELFHANDLE = Symbol("self_handle");
const reservedKeys = ["dataStatus"];

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

          if (!arg1._id) {
            // 属于读取文件夹的数据，不需要写入记录
            await writeDataHandle(this);
          }

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

      await this._initData(data, "handle");
    }

    wid = this.watchTick((watchers) => {
      const needSaveDatas = new Set();

      // 根据变动存储其他的对象
      watchers.forEach((watchOpt) => {
        if (watchOpt.type === "set" && reservedKeys.includes(watchOpt.name)) {
          return;
        }

        if (watchOpt.path.length) {
          // 设置值可能会删除旧的对象值，所以要特别监听
          needSaveDatas.add(watchOpt.target);
        } else {
          needSaveDatas.add(this);
        }
      });

      needSaveDatas.forEach(async (hdata) => {
        // 确保handle已经被设置
        await hdata.watchUntil(() => !!hdata[SELFHANDLE]);

        writeDataHandle(hdata);
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

    for (let [key, value] of Object.entries(data)) {
      if (typeof value === "string" && value.startsWith("___dataid___")) {
        const targetId = value.slice(12);

        const targetDFile = await this[SELFHANDLE].get(`${targetId}/_d`);
        const dataText = await targetDFile.text();

        this[key] = JSON.parse(dataText);
      } else {
        this[key] = value;
      }
    }

    this.dataStatus = "inited";
  }

  get __OriginStanz() {
    return HybirdData;
  }

  get _dataid() {
    return this[DATAID];
  }
}

// 将数据变动写到文件内
const writeDataHandle = async (hydata) => {
  const obj = {
    _id: hydata._dataid,
  };

  // TODO: 确保被删除的旧对象被回收

  for (let [key, value] of Object.entries(hydata)) {
    if (reservedKeys.includes(key) || /^\_/.test(key)) {
      continue;
    }

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

  console.log("write obj: ", obj);
};
