import { PublicBaseHandle, notify } from "../public/base.js";
import { setData } from "./db.js";

export class BaseDBHandle extends PublicBaseHandle {
  #name;
  #dbId;

  constructor({ name, dbId, root, parent }) {
    super({
      root,
      parent,
    });
    this.#name = name;
    this.#dbId = dbId;
  }

  get _dbid() {
    return this.#dbId;
  }

  get name() {
    return this.#name;
  }

  isSame(target) {
    return this.#dbId === target._dbid;
  }

  async remove() {
    if (this.kind === "dir") {
      // 先删除所有子文件
      for await (let e of this.values()) {
        await e.remove();
      }
    }
    // 再删除自己
    await setData({
      deletes: [this.#dbId],
    });
    notify({
      type: "remove",
      path: this.path,
    });
  }
}
