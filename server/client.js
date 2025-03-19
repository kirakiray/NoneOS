import { getHash } from "../packages/fs/util.js";
import { verifyData } from "../packages/user/verify.js";
// 所有的用户
export const clients = new Set();
export const users = new Map();

export class ServerHandClient {
  constructor(ws) {
    this._ws = ws;
    this._userid = null;
    this.userinfo = {};

    // 随机生成一个markid
    this.markid = Math.random().toString(36).slice(2);

    // 5秒内没有验证就关闭连接
    const timer = setTimeout(() => {
      this._ws.close();
    }, 5000);

    clients.add(this);

    // 发送 markid 给客户端验证是否真实的用户
    this.send({
      type: "init",
      mark: this.markid,
    });

    ws.on("message", async (message) => {
      console.log("收到消息:", message.toString());

      let msg;

      try {
        msg = JSON.parse(message.toString());
      } catch (error) {
        console.log("消息不是json");
        return;
      }

      switch (msg.type) {
        case "auth":
          {
            //  验证用户是否真实，确定没有被伪造F
            const { result, data } = await verifyData(msg.authedData);
            const { publicKey, time: creationTime } = msg.authedData.data;

            // 不是本人签名的数据，直接关闭
            if (!result) {
              this.close();
              return;
            }

            // markid对不上，直接关闭
            if (data.markid !== this.markid) {
              this.close();
              return;
            }

            this.userinfo = data;

            // 验证通过，清除延时检查机制，继续初始化操作
            clearTimeout(timer);

            // 配置用户id
            const userid = await getHash(publicKey);
            this._userid = userid;

            users.set(userid, {
              ws: this._ws,
              publicKey,
              creationTime,
            });

            // 通知验证成功
            this.send({
              type: "authed",
            });
          }
          break;
      }
    });

    ws.on("close", () => {
      this.clear();
      console.log("客户端断开连接");
    });

    ws.on("error", (err) => {
      this.clear();
      console.log("客户端错误:", err);
    });
  }

  send(data) {
    this._ws.send(JSON.stringify(data));
  }

  close() {
    this._ws.close();
  }

  clear() {
    clients.delete(this);
    if (this._userid) {
      users.delete(this._userid);
    }
  }
}
