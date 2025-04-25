import { Stanz } from "../libs/stanz/main.js";

import {
  SELFHANDLE,
  DATAID,
  getRandomId,
  reservedKeys,
  Identification,
} from "./common.js";

import { saveData } from "./save-data.js";

export class HybirdData extends Stanz {
  constructor(data, options) {
    super({
      dataStatus: "preparing",
    });

    if (!options) {
      // stanz删除时的错误初始化
      return;
    }

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
      // 属于新设置的数据，直接进行初始化操作
      if (options.owner) {
        this[DATAID] = getRandomId();
        (async () => {
          Object.assign(this, data);
          // await this._resetData(data);
          await options.owner.watchUntil(() => !!options.owner[SELFHANDLE]);

          const selfDir = await options.owner[SELFHANDLE].get(this[DATAID], {
            create: "dir",
          });

          this[SELFHANDLE] = selfDir;
          this.dataStatus = "ok";

          saveData(this);
        })();
      } else {
        // 不明情况
        debugger;
      }
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

        saveData(watchOpt.target);
      });
    });

    cancelObs = await handle.observe((e) => {
      if (e.type !== "write") {
        return;
      }

      if (e.remark && this.xid === e.remark.rootXid) {
        // 修改的是自身，不需要变动
        return;
      }

      const realPath = e.path.replace(this[SELFHANDLE].path + "/", "");

      if (realPath == "_d") {
        // 更新自身
        this.reload();
        return;
      }

      const paths = realPath.split("/");

      let targetData = this;
      let isFinnal = false;

      while (paths.length > 1) {
        const currentObjKey = paths.shift();
        for (let [key, value] of Object.entries(targetData)) {
          if (value[DATAID] === currentObjKey) {
            targetData = targetData[key];
            isFinnal = paths.length === 1;
            continue;
          }
        }
      }
      if (isFinnal) {
        // 不是当前数据的改动，更新数据
        targetData.reload();
        return;
      }

      // TODO: 不存在key，可能被清除了
      // debugger;
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
      // 没有数据就是空对象
      // console.warn("cannot find data", this);
      // this.revoke();
      this.dataStatus = "ok";
      return;
    }

    const data = JSON.parse(text);

    if (this[DATAID] && this[DATAID] !== data._id) {
      // TODO: 抛出异常
      debugger;
      throw new Error("data error");
    }

    if (data._id) {
      this[DATAID] = data._id;
    } else if (!this[DATAID]) {
      this[DATAID] = getRandomId();
    }

    await this._resetData(data);

    this.dataStatus = "ok";
  }

  // 重置数据
  async _resetData(data) {
    this.dataStatus = "resetting";

    const finnalData = {};

    // 先保留一份
    const currentValues = Object.values(this);
    // 确保子级的数据加载完成再操作
    await Promise.all(
      currentValues.map(async ([key, value]) => {
        if (value instanceof HybirdData) {
          await value.ready();
        }
      })
    );

    await Promise.all(
      Object.entries(data).map(async ([key, value]) => {
        if (reservedKeys.includes(key) || /^\_/.test(key)) {
          return;
        }

        if (typeof value === "string" && value.startsWith(Identification)) {
          const targetId = value.slice(Identification.length);

          // 判断是否已经存在的数据
          const exitedData = currentValues.find(
            (data) => data[DATAID] === targetId
          );

          if (exitedData) {
            // 从已有的值中获取
            finnalData[key] = exitedData;
            return;
          }

          // 读取本地数据
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

    const finnalKeys = Object.keys(finnalData);
    // 删除不存在的key
    Object.keys(this).forEach((key) => {
      if (reservedKeys.includes(key) || /^\_/.test(key)) {
        return;
      }

      if (!finnalKeys.includes(key)) {
        delete this[key];
      }
    });

    // 重新合并数据
    Object.assign(this, finnalData);
    delete this.__unupdate;
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

  // 获取可以存储的数据
  getCachedData() {
    const finnalObj = {
      _id: this[DATAID],
    };

    for (let [key, value] of Object.entries(this)) {
      if (reservedKeys.includes(key) || /^\_/.test(key)) {
        continue;
      }

      // 如果是对象类型，写入到新的文件夹内
      if (value && typeof value === "object") {
        finnalObj[key] = `${Identification}${value[DATAID]}`;
        continue;
      }

      finnalObj[key] = value;
    }

    return finnalObj;
  }
  get __OriginStanz() {
    return HybirdData;
  }

  get _dataid() {
    return this[DATAID];
  }

  toJSON() {
    const data = Stanz.prototype.toJSON.call(this);
    removeDataStatus(data);
    return data;
  }
}

// 去除对象和子对象的所有 dataStatus 属性
export const removeDataStatus = (obj) => {
  if (obj.dataStatus) {
    delete obj.dataStatus;
  }

  Object.values(obj).forEach((value) => {
    if (value && typeof value === "object") {
      removeDataStatus(value);
    }
  });
};

export const createData = async (handle) => {
  const data = new HybirdData(
    {},
    {
      handle,
      isroot: true,
    }
  );

  await data.ready();

  return data;
};
