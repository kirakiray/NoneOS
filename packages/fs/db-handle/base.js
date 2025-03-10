import { PublicBaseHandle } from "../public.js";

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

  get name() {
    return this.#name;
  }

  get _dbid() {
    return this.#dbId;
  }
}
