import { BaseDBHandle } from "./base.js";
import { FileDBHandle } from "./file.js";
import { getData, setData, getRandomId } from "./db.js";
import { extendDirHandle } from "../public/dir.js";

export class DirDBHandle extends BaseDBHandle {
  constructor(...args) {
    super(...args);
  }
  async get(name, options = {}) {
    if (name.includes("/")) {
      return await this._getByMultiPath(name, options);
    }

    let targetData = await getData({
      indexName: "parentAndName",
      index: [this._dbid, name],
    });

    if (!targetData && !options.create) {
      return null;
    }

    // 不存在的话，判断是否需要创建
    if (
      !targetData &&
      (options.create === "file" || options.create === "dir")
    ) {
      targetData = {
        id: getRandomId(),
        name,
        parent: this._dbid,
        type: options.create,
      };

      await setData({
        puts: [targetData],
      });
    }

    if (targetData.type === "file") {
      return new FileDBHandle({
        name: targetData.name,
        dbId: targetData.id,
        parent: this,
        root: this.root,
      });
    } else if (targetData.type === "dir") {
      return new DirDBHandle({
        name: targetData.name,
        dbId: targetData.id,
        parent: this,
        root: this.root,
      });
    }

    return null;
  }

  async length() {
    return await getData({
      indexName: "parent",
      index: this._dbid,
      method: "count",
    });
  }

  async *keys() {
    let datas = await getData({
      indexName: "parent",
      index: this._dbid,
      method: "getAll",
    });

    for (const item of datas) {
      yield item.name;
    }
  }
}

extendDirHandle(DirDBHandle);
