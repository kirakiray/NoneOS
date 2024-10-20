import { User } from "./public-user.js";

export class UserClient extends $.Stanz {
  constructor(opt) {
    super({
      status: "disconnected", // 连接状态 disconnected, connecting, connected
    });

    const { data, sign } = opt;
    const user = (this._user = new User(data, sign));

    Object.assign(this, {
      userId: user.id,
      userName: user.name,
      time: user.get("time"),
    });
  }

  async verify() {
    return await this._user.verify();
  }
}
