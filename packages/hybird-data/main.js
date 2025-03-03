const Stanz = $.Stanz;

const DATAID = Symbol("data_id");
const SELFHANDLE = Symbol("self_handle");
const reservedKeys = ["dataStatus", "_id"];

const Identification = "__dataid__";

export class HybirdData extends Stanz {
  constructor(arg, options) {
    super({
      dataStatus: "preparing",
    });

    // BUG: 当splice时，会莫名将数字参数带进来，这时候判断是非对象的话，直接返回
    if (!(arg instanceof Object)) {
      return;
    }

    // 确认是handle，使用handle进行初始化
    if (arg._mark === "db") {
      this[SELFHANDLE] = arg;

      this._initByHandle(arg);
    } else {
      // 不是handle，代表是子孙代对象
      this._initId(arg);

      Promise.all([
        // 设置 handler
        (async () => {
          const { owner } = options;
          if (owner) {
            if (!owner[SELFHANDLE]) {
              await owner.watchUntil(() => !!owner[SELFHANDLE], 3000);
            }

            this[SELFHANDLE] = await owner[SELFHANDLE].get(this._dataid, {
              create: "dir",
            });

            // 冒泡改动，触发 watchUntil
            this.refresh();
          }
        })(),

        (async () => {
          await this._initData({ ...arg });

          if (!arg._id) {
            // 属于新增数据，需要直接保存
            writeDataByHandle(this);
          }
        })(),
      ]).then(() => {
        this.dataStatus = "ok";
      });
    }
  }

  // 更新数据
  async reload() {}

  async _initData(data) {
    if (data.dataStatus) {
      const err = new Error("dataStatus is a reserved key");
      console.warn(err, data);
      throw err;
    }

    this.dataStatus = "loading";

    if (!this[SELFHANDLE]) {
      // 等待自身handle 初始化完成
      // console.log("等待自身handle 初始化完成", this);
      await this.watchUntil(() => !!this[SELFHANDLE], 3000);
    }

    const needRun = [];

    await Promise.all(
      Object.entries(data).map(async ([key, value]) => {
        if (reservedKeys.includes(key) || /^\_/.test(key)) {
          return;
        }

        if (typeof value === "string" && value.startsWith(Identification)) {
          const targetId = value.slice(Identification.length);

          try {
            const targetDFile = await this[SELFHANDLE].get(`${targetId}/_d`);
            const dataText = await targetDFile.text();

            needRun.push(() => {
              this[key] = JSON.parse(dataText);
            });
          } catch (err) {
            // TODO: 查找不到对象数据
            console.warn("找不到对象数据: ", {
              target: this,
              key,
              dataid: targetId,
            });
          }
        } else {
          needRun.push(() => {
            this[key] = value;
          });
        }
      })
    );

    this.__unupdate = 1;

    needRun.forEach((f) => f());

    delete this.__unupdate;

    this.dataStatus = "loaded";
  }

  _initId(data) {
    if (data && data._id) {
      this[DATAID] = data._id;
    } else {
      this[DATAID] = getRandomId();
    }
  }

  async _initByHandle(handle) {
    let wid;

    Object.defineProperties(this, {
      // 停止监听
      disconnect: {
        value: () => this.unwatch(wid),
      },
    });

    const dFile = await handle.get("_d", {
      create: "file",
    });

    const text = await dFile.text();

    if (text) {
      const data = JSON.parse(text);
      this._initId(data);
      await this._initData(data);
    } else {
      this._initId();
    }

    this.dataStatus = "ok";

    wid = this.watchTick((watchers) => {
      // 根据变动存储其他的对象
      watchers.forEach((watchOpt) => {
        if (watchOpt.type === "refresh") {
          return;
        }

        if (watchOpt.type === "set" && reservedKeys.includes(watchOpt.name)) {
          return;
        }

        if (watchOpt.type === "set") {
          console.log(watchOpt);
        }

        writeDataByHandle(watchOpt.target);
      });
    });
  }

  get __OriginStanz() {
    return HybirdData;
  }

  get _dataid() {
    return this[DATAID];
  }
}

// 临时存储监听的池子
const watcherPool = [];

// 重新保存数据
const writeDataByHandle = async (hydata) => {
  console.log("writeDataByHandle: ", hydata);
  if (!watcherPool.includes(hydata)) {
    watcherPool.push(hydata);
  }

  if (!isRunning) {
    // 添加延迟减少重复写入的次数
    await new Promise((resolve) => setTimeout(resolve, 200));

    isRunning = true;

    runWriteTask();
  }
};

let isRunning = false;
const runWriteTask = async () => {
  const nextHyData = watcherPool.shift();

  if (!nextHyData) {
    isRunning = false;
    return;
  }

  if (!nextHyData[SELFHANDLE]) {
    await nextHyData.watchUntil(() => !!nextHyData[SELFHANDLE], 3000);
  }

  let oldData;

  const dFile = await nextHyData[SELFHANDLE].get("_d", {
    create: "file",
  });

  try {
    oldData = await dFile.text();
    if (oldData) {
      oldData = JSON.parse(oldData);
    }
  } catch (err) {
    // TODO: 错误的旧文件读取操作
    debugger;
  }

  const finnalObj = {
    _id: nextHyData[DATAID],
  };

  for (let [key, value] of Object.entries(nextHyData)) {
    if (reservedKeys.includes(key) || /^\_/.test(key)) {
      continue;
    }

    // 如果是对象类型，写入到新的文件夹内
    if (typeof value === "object") {
      finnalObj[key] = `${Identification}${value._dataid}`;
      continue;
    }

    finnalObj[key] = value;
  }

  await dFile.write(JSON.stringify(finnalObj));

  // 新value值，用于确认旧对象是否被删除
  const newValues = Object.values(finnalObj);

  // 清除被删除的子对象
  await Promise.all(
    Object.entries(oldData).map(async ([key, value]) => {
      if (reservedKeys.includes(key) || /^\_/.test(key)) {
        return;
      }

      // 如果是对象标识，则判断是否已被删除
      if (
        value instanceof String &&
        value.startsWith(Identification) &&
        !newValues.includes(value)
      ) {
        // 旧对象已经被删除
        const targetId = value.slice(Identification.length);

        const targetSubDirHandle = await nextHyData[SELFHANDLE].get(targetId);

        if (!targetSubDirHandle) {
          console.log("子对象没找到: ", targetId);
          return;
        }

        await targetSubDirHandle.remove();
      }
    })
  );

  console.log("runWriteTask", nextHyData);

  runWriteTask();
};

const getRandomId = () => Math.random().toString(36).slice(2);
