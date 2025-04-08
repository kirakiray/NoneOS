import { PublicBaseHandle } from "../public/base.js";

export class RemoteBaseHandle extends PublicBaseHandle {
  #name;
  #connection;
  #userDirName;
  constructor({ root, parent, connection, name, userDirName }) {
    super({ root, parent });
    this.#name = name;
    this.#connection = connection;
    this.#userDirName = userDirName;
  }

  get name() {
    return this.#name;
  }

  get _userDirName() {
    return this.#userDirName;
  }

  get _connection() {
    return this.#connection;
  }

  // get parent() {
  //   debugger;
  // }

  // get root() {
  //   debugger;
  // }
}
