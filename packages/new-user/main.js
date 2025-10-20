import { get, init } from "/packages/fs/handle/main.js";
import { BaseUser } from "./base-user.js";
import { LocalUser } from "./local-user.js";
import { broadcast } from "./util/broadcast.js";

broadcast.onmessage = (event) => {
  const { type, detail } = event.data;

  console.log("收到消息:", type, detail);

  if (type === "rtc-agent-message") {
    const {
      fromUserId,
      fromUserSessionId,
      proxySessionId,
      userDirName,
      message,
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
              message,
            },
          })
        );
      }
    });
  }
};

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

    return user;
  })());
};
