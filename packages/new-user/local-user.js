import { User } from "./user.js";

export class LocalUser extends User {
  #dirHandle;
  constructor(handle) {
    super(handle);
    this.#dirHandle = handle;
  }
}
