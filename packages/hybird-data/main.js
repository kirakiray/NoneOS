import {
  writeDataByHandle,
  SELFHANDLE,
  Identification,
  reservedKeys,
  DATAID,
} from "./write-data.js";

const Stanz = $.Stanz;

export class HybirdData extends Stanz {
  constructor(startData, options) {
    super({
      dataStatus: "preparing",
    });

    // BUG: 当splice时，会莫名将数字参数带进来，这时候判断是非对象的话，直接返回
    if (!(startData instanceof Object)) {
      return;
    }

    // 确认是handle，使用handle进行初始化
    if (startData._mark === "db") {
      this[SELFHANDLE] = startData;

      this._initByHandle(startData);
    } else {
      // 不是handle，代表是子孙代对象
      this._initId(startData);

      Promise.all([
        // 设置 handler
        (async () => {
          const { owner } = options;
          if (owner) {
            await owner._handleReady();

            this[SELFHANDLE] = await owner[SELFHANDLE].get(this._dataid, {
              create: "dir",
            });

            // 冒泡改动，触发 watchUntil
            this.refresh();
          }
        })(),

        (async () => {
          await this._initData({ ...startData });

          if (!startData._id) {
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

  async ready() {
    if (this.dataStatus === "ok") {
      return true;
    }

    await this.watchUntil(() => this.dataStatus === "ok", 3000);

    return true;
  }

  async _handleReady() {
    if (!this[SELFHANDLE]) {
      // 等待自身handle 初始化完成
      await this.watchUntil(() => !!this[SELFHANDLE], 3000);
    }

    return true;
  }

  async _initData(data) {
    if (data.dataStatus) {
      const err = new Error("dataStatus is a reserved key");
      console.warn(err, data);
      throw err;
    }

    this.dataStatus = "loading";

    await this._handleReady();

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

const getRandomId = () => Math.random().toString(36).slice(2);
