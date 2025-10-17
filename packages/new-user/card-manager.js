import { initDB } from "../util/init-db.js";

export class CardManager {
  #db = null;
  constructor(user) {
    this.self = user;
  }

  async init() {
    this.#db = await initDB("noneos-" + this.self.dirName);
  }

  async save(cardData) {
    debugger;
  }

  async get(options) {
    let userId, signature; // 如果有userId，就根据userId查询；如果有signature，就根据signature查询；userId优先；

    if (typeof options === "string") {
      userId = options;
    } else if (options.userId || options.signature) {
      ({ userId, signature } = options);
    }

    debugger;
  }

  async delete() {
    debugger;
  }
}
