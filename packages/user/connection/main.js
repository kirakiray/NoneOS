import { getConnection } from "./public.js";
import { UserConnection } from "./connection.js";
import { tabSessionid, getUserStore } from "../user-store.js";
import { agentData } from "../hand-server/agent.js";

import { on } from "../event.js";

on("server-agent-data", (e) => {
  // 转发给本地的用户名
  const { userDirName } = e;

  if (e.data.kind === "connect-user") {
    // 有用户向你发送连接请求，查看是否存在这个用户实例
    const connectionStore = getConnection(userDirName);

    let targetUserConnection = connectionStore.find(
      (e) => e.userId === e.data.userId
    );

    if (!targetUserConnection) {
      // 如果不存在，创建一个新的连接实例
      targetUserConnection = new UserConnection({
        userId: e.fromUserId,
        selfUser: getUserStore(userDirName),
        tabId: tabSessionid,
      });

      // 添加到连接存储
      connectionStore.push(targetUserConnection);

      debugger;
    }
  }
});

// 连接目标设备
export const connect = async ({ userId, tabId }, userDirName) => {
  userDirName = userDirName || "main";
  tabId = tabId || tabSessionid; // 强制使用当前的tabId

  const connectionStore = getConnection(userDirName);

  let targetUserConnection = connectionStore.find((e) => e.userId === userId);

  if (targetUserConnection) {
    return targetUserConnection;
  }

  // 创建实例
  targetUserConnection = new UserConnection({
    userId,
    selfUser: getUserStore(userDirName),
    selfTab: tabId,
  });

  // 添加到连接存储
  connectionStore.push(targetUserConnection);

  // 创建 offer
  // const offer = await targetUserConnection.createOffer();

  // 通过服务器转发数据
  agentData({
    friendId: userId,
    userDirName,
    data: {
      kind: "connect-user",
    },
  });

  return targetUserConnection;
};

// 获取连接存储
export const getConnectionStore = (userDirName) => {
  return getConnection(userDirName);
};
