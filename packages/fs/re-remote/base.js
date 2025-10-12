import { PublicBaseHandle } from "../public/base.js";

export class RemoteBaseHandle extends PublicBaseHandle {
  #path;

  constructor(options) {
    super(options);
    const { path } = options;
    this.#path = path;
  }

  get name() {
    return this.#path.split("/").pop();
  }

  get remoteUserId() {}

  get path() {
    return this.#path;
  }

  get parent() {
    debugger;
  }

  get root() {}

  async id() {}

  async remove() {}

  async size() {}

  async isSame(target) {}

  async observe(func) {}

  get _mark() {
    return "remote";
  }
}
