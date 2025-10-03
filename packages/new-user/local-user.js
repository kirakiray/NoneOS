import { createSingleData } from "../hybird-data/single-data.js";
import { User } from "./user.js";

const infos = {};

export class LocalUser extends User {
  #dirHandle;
  constructor(handle) {
    super(handle);
    this.#dirHandle = handle;
  }

  // 获取用户信息对象
  async info() {
    if (infos[this.#dirHandle.path]) {
      return infos[this.#dirHandle.path];
    }

    const infoHandle = await this.#dirHandle.get("info.json", {
      create: "file",
    });

    const infoData = await createSingleData({
      handle: infoHandle,
      disconnect: false,
    });

    // 如果没有默认信息，则添加默认信息
    if (!infoData.name) {
      infoData.name = `User-${Math.random().toString(36).slice(2, 6)}`;
    }

    infos[this.#dirHandle.path] = infoData;

    return infoData;
  }
}
