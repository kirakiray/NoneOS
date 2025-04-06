import { getConnection } from "./public.js";
import { UserConnection } from "./connection.js";
import { tabSessionid } from "../user-store.js";
import { agentData } from "../hand-server/agent.js";

import { on } from "../event.js";

on("server-agent-data", async (e) => {
  const {
    userDirName, // 转发给本地的用户名
    fromUserId, // 发送请求的用户ID
    data,
  } = e;

  // 有用户向你发送连接请求，查看是否存在这个用户实例
  const connectionStore = getConnection(userDirName);

  //   let targetUserConnection = connectionStore.find(
  //     (e) => e.userId === fromUserId
  //   );

  switch (data.kind) {
    case "connect-user": {
      let targetUserConnection = connectionStore.find(
        (e) => e.userId === fromUserId
      );

      if (!targetUserConnection) {
        // 如果不存在，创建一个新的连接实例
        targetUserConnection = new UserConnection({
          userId: fromUserId,
          userDirName,
          selfTabId: tabSessionid,
        });

        // 添加到连接存储
        connectionStore.push(targetUserConnection);
      }

      const connection = targetUserConnection.getConnection(data.fromTabId);

      // 创建channel（必须要提前创建，不然会导致无法发送 candidata 数据）
      connection.getChannel("default", true);

      // 创建offer 和 channel
      const offer = await connection.createOffer();
      connection.setLocalDescription(offer);

      // 响应对方和我进行连接
      agentData({
        friendId: fromUserId, // 对方的用户ID
        userDirName, // 使用本地的用户名目录
        data: {
          kind: "response-offer",
          fromTabId: targetUserConnection.selfTabId,
          toTabId: data.fromTabId, // 返回给目标设备的tabId
          offer,
        },
      });

      console.log("connect-user-end", data);
      break;
    }
    case "response-offer": {
      const targetUserConnection = connectionStore.find(
        (e) => e.userId === fromUserId && data.toTabId === e.selfTabId
      );

      // 创建连接
      const connection = targetUserConnection.getConnection(data.fromTabId);

      connection.setRemoteDescription(new RTCSessionDescription(data.offer));
      // 创建answer
      const answer = await connection.createAnswer();
      connection.setLocalDescription(answer);

      agentData({
        friendId: fromUserId, // 对方的用户ID
        userDirName, // 使用本地的用户名目录
        data: {
          kind: "response-answer",
          toTabId: data.fromTabId,
          fromTabId: targetUserConnection.selfTabId, // 从哪个tabId连接过去
          answer,
        },
      });
      console.log("response-offer-end", data);
      break;
    }
    case "response-answer": {
      const targetUserConnection = connectionStore.find(
        (e) => e.userId === fromUserId && data.toTabId === e.selfTabId
      );

      const connection = targetUserConnection.getConnection(data.fromTabId);
      connection.setRemoteDescription(new RTCSessionDescription(data.answer));

      console.log("response-answer-end", data);
      break;
    }
    case "agent-ice-candidate": {
      const targetUserConnection = connectionStore.find(
        (e) => e.userId === fromUserId && data.toTabId === e.selfTabId
      );

      let candidate = JSON.parse(data.candidate);
      candidate = new RTCIceCandidate(candidate);

      const connection = targetUserConnection.getConnection(data.fromTabId);

      // 设置远程的ICE候选
      connection.addIceCandidate(candidate);
      console.log("ice-candidate-end", data);
      break;
    }
    default:
      debugger;
      console.log("未知的消息类型", data.kind);
      break;
  }
});

// 连接目标设备
export const connect = ({ userId, selfTabId }, userDirName) => {
  userDirName = userDirName || "main";
  selfTabId = selfTabId || tabSessionid; // 强制使用当前的tabId

  const connectionStore = getConnection(userDirName);

  let targetUserConnection = connectionStore.find(
    (e) => e.userId === userId && e.selfTabId === selfTabId
  );

  if (!targetUserConnection) {
    // 创建实例
    targetUserConnection = new UserConnection({
      userId,
      userDirName,
      selfTabId: selfTabId,
    });

    // 添加到连接存储
    connectionStore.push(targetUserConnection);
  }

  // 通知对方和我进行连接
  agentData({
    friendId: userId,
    userDirName,
    data: {
      kind: "connect-user",
      fromTabId: selfTabId, // 从哪个tabId连接过去
    },
  });

  return targetUserConnection;
};

// 获取连接存储
export const getConnectionStore = (userDirName) => {
  return getConnection(userDirName);
};
