export class PulicBaseHandle {
  #parent;
  #root;
  constructor(options) {
    this.#parent = options.parent;
    this.#root = options.root;
  }
}
