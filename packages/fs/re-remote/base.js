import { PublicBaseHandle } from "../public/base.js";

export class RemoteBaseHandle extends PublicBaseHandle {
  constructor() {}

  get name() {}

  get remoteUserId() {}

  get path() {}

  get parent() {}

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
