import {
  saveData,
  SELFHANDLE,
  Identification,
  reservedKeys,
  DATAID,
} from "./write-data.js";

const Stanz = $.Stanz;
const ISOBSRELOAD = Symbol("is_observe_reload");

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
          await this._handleReady();
          await this._initData({ ...startData });

          if (!startData._id) {
            // 属于新增数据，需要直接保存
            saveData(this);
          }
        })(),
      ]).then(() => {
        this.dataStatus = "ok";
      });
    }
  }

  // 更新数据
  async reload(options) {
    await this._handleReady();

    const handle = this[SELFHANDLE];

    const dFile = await handle.get("_d", {
      create: "file",
    });

    const text = await dFile.text();
    const data = JSON.parse(text);

    if (options.ISOBSRELOAD === ISOBSRELOAD) {
      console.log("isobsreload");
    }

    delete data._id;

    await this._initData(data, { ...options });

    this.dataStatus = "ok";
  }

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

  // 获取可以存储的数据
  getMarkData() {
    const finnalObj = {
      _id: this[DATAID],
    };

    for (let [key, value] of Object.entries(this)) {
      if (reservedKeys.includes(key) || /^\_/.test(key)) {
        continue;
      }

      // 如果是对象类型，写入到新的文件夹内
      if (value && typeof value === "object") {
        finnalObj[key] = `${Identification}${value._dataid}`;
        continue;
      }

      finnalObj[key] = value;
    }

    return finnalObj;
  }

  async _initData(data, options) {
    if (data.dataStatus) {
      const err = new Error("dataStatus is a reserved key");
      console.warn(err, data);
      throw err;
    }

    this.dataStatus = "loading";

    // await this._handleReady();

    // 判断已有的key

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
      return;
    }

    this[DATAID] = getRandomId();
  }

  async _initByHandle(handle) {
    let wid, cancelObs;

    Object.defineProperties(this, {
      // 停止监听
      disconnect: {
        value: () => {
          this.unwatch(wid);
          this.revoke();
          cancelObs();
        },
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

    // 监听数据变动，变动后进行保存数据
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

        saveData(watchOpt.target);
      });
    });

    cancelObs = handle.observe((arr) => {
      arr.forEach((e) => {
        if (e.type !== "write") {
          return;
        }

        const { dataXid, rootXid } = e.remark;

        if (rootXid === this.xid) {
          // 代表是当前数据的改动，跳过
          return;
        }

        const selfHandle = this[SELFHANDLE];
        const realPath = e.path.replace(selfHandle.path + "/", "");
        const paths = realPath.split("/");

        let targetData = this;
        let isFinnal = false;

        while (paths.length > 1) {
          const currentObjKey = paths.shift();
          for (let [key, value] of Object.entries(targetData)) {
            if (value._dataid === currentObjKey) {
              targetData = targetData[key];
              isFinnal = paths.length === 1;
              continue;
            }
          }
        }

        if (isFinnal && targetData.xid !== dataXid) {
          // 不是当前数据的改动，更新数据
          targetData.reload({ ISOBSRELOAD });
          return;
        }

        // TODO: 不存在key，可能被清除了
        debugger;
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
