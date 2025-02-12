const Stanz = $.Stanz;

const DATAID = Symbol("data_id");
const SELFHANDLE = Symbol("self_handle");
const reservedKeys = ["dataStatus", "_id"];

const getRandomId = () => Math.random().toString(36).slice(2);

export class HybirdData extends Stanz {
  constructor(arg1, options) {
    super({
      dataStatus: "preparing",
    });

    // BUG: 当splice时，会莫名将数字参数带进来，这时候判断是非对象的话，直接返回
    if (!(arg1 instanceof Object)) {
      return;
    }

    if (arg1._mark === "db") {
      this._initByHandle(arg1);
    } else {
      const { owner: parentData } = options || {};

      if (parentData) {
        (async () => {
          // 等待父元素初始化完成
          await parentData.watchUntil(() => parentData[SELFHANDLE]);

          this.initDataId(arg1);

          this[SELFHANDLE] = await parentData[SELFHANDLE].get(this._dataid, {
            create: "dir",
          });

          this._initData({ ...arg1 });

          if (!arg1._id) {
            // 属于读取文件夹的数据，不需要写入记录
            await writeDataHandle(this);
          }

          this.dataStatus = "ok";
        })();
      }
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

      this.initDataId(data);
      await this._initData(data);
    } else {
      this.initDataId();
    }

    this.dataStatus = "ok";

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
  }

  initDataId(data) {
    if (data && data._id) {
      this[DATAID] = data._id;
      delete data._id;
    } else {
      this[DATAID] = getRandomId();
    }
  }

  async _initData(data) {
    if (data.dataStatus) {
      const err = new Error("dataStatus is a reserved key");
      console.warn(err, data);
      throw err;
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

// 需要等待前一次的写入结束后，才能继续下一轮的写入
let writePms = Promise.resolve();

// 将数据变动写到文件内
const writeDataHandle = async (hydata) => {
  // 等待上一个队列结束
  await writePms;

  //

  // 确保被删除的旧对象被回收
  let oldData;

  try {
    oldData = await hydata[SELFHANDLE].get("_d", { create: "file" }).then((e) =>
      e.text()
    );
    if (oldData) {
      oldData = JSON.parse(oldData);
    }
  } catch (err) {
    // TODO: 错误的文件读取操作
    debugger;
  }

  const obj = {
    _id: hydata._dataid,
  };

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

  // 新value值，用于确认旧对象是否被删除
  const newValues = Object.values(obj);

  // 清除被删除的子对象
  await Promise.all(
    Object.entries(oldData).map(async ([key, value]) => {
      if (reservedKeys.includes(key) || /^\_/.test(key)) {
        return;
      }

      // 如果是对象标识，则判断是否已被删除
      if (/___dataid___/.test(value) && !newValues.includes(value)) {
        // 旧对象已经被删除
        const targetId = value.slice(12);

        const targetSubDirHandle = await hydata[SELFHANDLE].get(targetId);

        if (!targetSubDirHandle) {
          debugger;
          return;
        }

        await targetSubDirHandle.remove();
      }
    })
  );

  console.log("writeDataHandle", hydata);
};
