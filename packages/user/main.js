import { get, init } from "/packages/fs/handle/main.js";
import { BaseUser } from "./base-user.js";
import { LocalUser } from "./local-user.js";
import { publicBroadcastChannel } from "./util/public-channel.js";
import trigger from "./internal/trigger.js";
import { checkAllConnection } from "./util/connection-checker.js";

publicBroadcastChannel.addEventListener("message", async (event) => {
  const { type, detail } = event.data;

  // console.log("收到消息:", type, detail);

  if (type === "rtc-agent-message") {
    // 别的标签接受到rtc数据后，转发到当前标签的数据
    const {
      fromUserId,
      fromUserSessionId,
      proxySessionId,
      userDirName,
      result,
      toUserSessionId,
    } = detail;

    Object.values(localUsers).forEach((user) => {
      if (user.sessionId === toUserSessionId) {
        // 查找到目标session标签页的用户实例，并将转发的数据进行出触发
        user.dispatchEvent(
          new CustomEvent("rtc-message", {
            detail: {
              fromUserId,
              fromUserSessionId,
              proxySessionId,
              userDirName,
              result,
            },
          })
        );
      }
    });
  } else if (type === "agent-trigger") {
    // 远端设备事件触发
    const {
      fromUserId,
      fromUserSessionId,
      data,
      proxySessionId,
      localUserDirName,
    } = detail;

    if (localUsers[localUserDirName]) {
      const localUser = localUsers[localUserDirName];

      trigger({
        fromUserId,
        fromUserSessionId,
        data,
        proxySessionId,
        localUser,
      });
    }
  } else if (type === "user-online") {
    // 其他标签收到用户重新连接的在线通知
    const { fromUserId, localUserDirName } = detail;

    if (localUsers[localUserDirName]) {
      const localUser = localUsers[localUserDirName];

      const remoteUser = await localUser.connectUser(fromUserId);

      // 重新检查
      await remoteUser.checkServer();
    }
  } else if (type === "card-change") {
    // 其他标签接受到了用户卡片
    const { fromUserId, fromUserSessionId, localUserDirName, card } = detail;

    const localUser = localUsers[localUserDirName];

    const cardManager = await localUser.cardManager();

    // 同时触发卡片更新事件
    cardManager.dispatchEvent(
      new CustomEvent("update", {
        detail: card,
      })
    );
  }
});

const localUsers = {};

// 创建用户数据
export const createUser = async (opts) => {
  const options = {
    user: "main",
    // publicKey:""
  };

  Object.assign(options, opts);

  if (options.publicKey) {
    const user = new BaseUser(options.publicKey);
    await user.init();
    return user;
  }

  if (localUsers[options.user]) {
    return localUsers[options.user];
  }

  return (localUsers[options.user] = (async () => {
    await init("system");

    const userDirHandle = await get(`system/user/${options.user}`, {
      create: "dir",
    });

    const user = new LocalUser(userDirHandle);

    localUsers[options.user] = user;

    await user.init();

    checkAllConnection(user, { loop: true });

    return user;
  })());
};
