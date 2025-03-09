import { BaseDBHandle } from "./base.js";
import { getData, setData } from "./db.js";

export class FileDBHandle extends BaseDBHandle {
  constructor(...args) {
    super(...args);
  }
}
