import {
  SELFHANDLE,
  SELFID,
  getRandomId,
  reservedKeys,
  Identification,
} from "./common.js";

import { saveData } from "./save-data.js";

const Stanz = $.Stanz;

export class HybirdData extends Stanz {
  constructor(data, options) {
    super({
      dataStatus: "preparing",
    });

    if (options.handle) {
      this[SELFHANDLE] = options.handle;
      if (options.isroot) {
        this._initRoot().then(() => {
          this.reload();
        });
      } else {
        this.reload();
      }
    } else {
      // TODO: 直接初始化数据
      debugger;
    }
  }

  async _initRoot() {
    const handle = this[SELFHANDLE];

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

    // 监听数据变动，变动后进行保存数据
    wid = this.watchTick((watchers) => {
      // 根据变动存储其他的对象
      watchers.forEach((watchOpt) => {
        if (watchOpt.type === "refresh") {
          // 代表是刷新，跳过
          return;
        }

        if (watchOpt.type === "set" && reservedKeys.includes(watchOpt.name)) {
          // 代表是保留的属性，跳过
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

        if (this.xid === e.remark.rootXid) {
          // 修改的是自身，不需要变动
          return;
        }

        debugger;
      });
    });
  }

  // 从handle上获取值，并进行初始化
  async reload() {
    this.dataStatus = "loading";

    const dFile = await this[SELFHANDLE].get("_d", {
      create: "file",
    });

    const text = await dFile.text();
    if (!text) {
      // TODO: 清空数据
      debugger;
      return;
    }

    const data = JSON.parse(text);

    if (this[SELFID] && this[SELFID] !== data._id) {
      // TODO: 抛出异常
      debugger;
      throw new Error("data error");
    }

    if (data._id) {
      this[SELFID] = data._id;
    } else if (!this[SELFID]) {
      this[SELFID] = getRandomId();
    }

    await this._resetData(data);

    this.dataStatus = "ok";
  }

  // 重置数据
  async _resetData(data) {
    this.dataStatus = "resetting";

    const finnalData = {};

    await Promise.all(
      Object.entries(data).map(async ([key, value]) => {
        if (reservedKeys.includes(key) || /^\_/.test(key)) {
          return;
        }

        if (typeof value === "string" && value.startsWith(Identification)) {
          const targetId = value.slice(Identification.length);

          const subDir = await this[SELFHANDLE].get(targetId, {
            create: "dir",
          });

          finnalData[key] = new HybirdData(
            {},
            {
              handle: subDir,
            }
          );

          return;
        }

        finnalData[key] = value;
      })
    );

    this.__unupdate = 1;
    Object.assign(this, finnalData);
    delete this.__unupdate;
  }

  // 确认当前对象已经初始化完成
  async ready() {
    if (this.dataStatus === "ok") {
      return true;
    }

    await this.watchUntil(() => this.dataStatus === "ok", 3000);

    return true;
  }

  // 获取可以存储的数据
  getCachedData() {
    const finnalObj = {
      _id: this[SELFID],
    };

    for (let [key, value] of Object.entries(this)) {
      if (reservedKeys.includes(key) || /^\_/.test(key)) {
        continue;
      }

      // 如果是对象类型，写入到新的文件夹内
      if (value && typeof value === "object") {
        finnalObj[key] = `${Identification}${value[SELFID]}`;
        continue;
      }

      finnalObj[key] = value;
    }

    return finnalObj;
  }
}

export const createData = (handle) => {
  return new HybirdData(
    {},
    {
      handle,
      isroot: true,
    }
  );
};
