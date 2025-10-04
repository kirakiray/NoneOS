import { HandServerClient } from "./hand.js";

export class AdminHandServerClient extends HandServerClient {
  constructor(ws, server, password) {
    super(ws, server);
    this.password = password;
  }
}
