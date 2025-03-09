export class PublicBaseHandle {
  #parent;
  #root;
  constructor(options) {
    this.#parent = options.parent;
    this.#root = options.root;
  }

  get parent() {
    return this.#parent;
  }

  get root() {
    return this.#root || this;
  }

  get path() {
    if (this.parent) {
      return `${this.parent.path}/${this.name}`;
    }

    return this.name;
  }
}
