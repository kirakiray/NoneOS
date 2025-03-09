import { BaseDBHandle } from "./base.js";
import { getData, setData } from "./db.js";

export class DirDBHandle extends BaseDBHandle {
  constructor(...args) {
    super(...args);
  }
  async get(name, options) {}
}
