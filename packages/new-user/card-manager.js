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

  async get({ userId, signature }) {
    debugger;
  }
}
