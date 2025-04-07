import { PublicBaseHandle } from "../public/base.js";

export class RemoteBaseHandle extends PublicBaseHandle {
  constructor({ root, parent }) {
    super({ root, parent });
  }

  get name() {}
}
