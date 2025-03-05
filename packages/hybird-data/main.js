import {
  SELFHANDLE,
  SELFID,
  getRandomId,
  reservedKeys,
  Identification,
} from "./common.js";

const Stanz = $.Stanz;

export class HybirdData extends Stanz {
  constructor(data, options) {
    super({
      dataStatus: "preparing",
    });

    if (options.handle) {
      this[SELFHANDLE] = options.handle;
      this.reload();
    } else {
      // TODO: 直接初始化数据
      debugger;
    }
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
}
