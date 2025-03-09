export class BaseDBHandle {
  #name;
  #dbId;
  #root;
  #parent;
  constructor({ name, dbId, root, parent }) {
    this.#name = name;
    this.#dbId = dbId;
    this.#root = root;
    this.#parent = parent;
  }

  get name() {
    return this.#name;
  }

  get path() {}

  get parent() {
    return this.#parent;
  }

  get root() {
    return this.#root || this;
  }
}
