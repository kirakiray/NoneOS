import { getConnections } from "./public.js";
import { UserConnection } from "./connection.js";
import { tabSessionid } from "../user-store.js";
import { agentData } from "../hand-server/agent.js";

import { on } from "../event.js";

on("server-agent-data", async (e) => {
  const {
    useLocalUserDirName, // 转发给本地的用户名
    fromUserId, // 发送请求的用户ID
    // data: signedData,
    data,
    signed, // 是签名的数据
  } = e;

  if (!signed) {
    // 未签名的数据，不处理
    console.warn("不接受未签名的数据", data);
    return;
  }

  // 有用户向你发送连接请求，查看是否存在这个用户实例
  const connectionStore = getConnections(useLocalUserDirName);

  switch (data.kind) {
    case "connect-user": {
      let targetUserConnection = connectionStore.find(
        (e) => e.userId === fromUserId
      );

      if (!targetUserConnection) {
        // 如果不存在，创建一个新的连接实例
        targetUserConnection = new UserConnection({
          userId: fromUserId,
          useLocalUserDirName,
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
        friendId: fromUserId,
        useLocalUserDirName,
        data: {
          kind: "response-offer",
          fromTabId: targetUserConnection.selfTabId,
          toTabId: data.fromTabId,
          offer,
        },
      });

      console.log(
        `[WebRTC:连接用户][用户:${fromUserId.slice(-5)}] 建立连接：从 ${
          targetUserConnection.selfTabId
        } 到 ${data.fromTabId}`,
        data
      );
      break;
    }
    case "response-offer": {
      const targetUserConnection = connectionStore.find(
        (e) => e.userId === fromUserId && data.toTabId === e.selfTabId
      );
      if (!targetUserConnection) {
        // 属于是其他tab的连接
        return;
      }

      // 创建连接
      const connection = targetUserConnection.getConnection(data.fromTabId);

      connection.setRemoteDescription(new RTCSessionDescription(data.offer));
      // 创建answer
      const answer = await connection.createAnswer();
      connection.setLocalDescription(answer);

      agentData({
        friendId: fromUserId, // 对方的用户ID
        useLocalUserDirName, // 使用本地的用户名目录
        data: {
          kind: "response-answer",
          toTabId: data.fromTabId,
          fromTabId: targetUserConnection.selfTabId, // 从哪个tabId连接过去
          answer,
        },
      });
      console.log(
        `[WebRTC:响应连接][用户:${fromUserId.slice(-5)}] 创建应答：从 ${
          targetUserConnection.selfTabId
        } 到 ${data.fromTabId}`,
        data
      );
      break;
    }
    case "response-answer": {
      const targetUserConnection = connectionStore.find(
        (e) => e.userId === fromUserId && data.toTabId === e.selfTabId
      );
      if (!targetUserConnection) {
        // 属于是其他tab的连接
        return;
      }

      const connection = targetUserConnection.getConnection(data.fromTabId);
      connection.setRemoteDescription(new RTCSessionDescription(data.answer));

      console.log(
        `[WebRTC:设置应答][用户:${fromUserId.slice(-5)}] 设置远程应答：从 ${
          data.fromTabId
        } 到 ${data.toTabId}`,
        data
      );
      break;
    }
    case "agent-ice-candidate": {
      const targetUserConnection = connectionStore.find(
        (e) => e.userId === fromUserId && data.toTabId === e.selfTabId
      );

      if (!targetUserConnection) {
        // 属于是其他tab的连接
        return;
      }

      let candidate = JSON.parse(data.candidate);
      candidate = new RTCIceCandidate(candidate);

      const connection = targetUserConnection.getConnection(data.fromTabId);

      // 设置远程的ICE候选
      connection.addIceCandidate(candidate);
      console.log(
        `[WebRTC:ICE候选][用户:${fromUserId.slice(-5)}] 添加ICE候选：从 ${
          data.fromTabId
        } 到 ${data.toTabId}`,
        data
      );
      break;
    }
    default:
      debugger;
      console.log(
        `[WebRTC:未知][用户:${fromUserId.slice(-5)}] 未知的消息类型:`,
        data.kind,
        data
      );
      break;
  }
});

// // 和用户连接前，是否已经同意
// let isAgree = true;

// if (isSafari) {
//   isAgree = false;
// }

export const getConnection = ({ userId, selfTabId, useLocalUserDirName }) => {
  useLocalUserDirName = useLocalUserDirName || "main";
  selfTabId = selfTabId || tabSessionid; // 强制使用当前的tabId

  if (!userId) {
    throw new Error("userId is required");
  }

  // TODO: safari的情况下，可能需要用户同意才能建立连接

  const connectionStore = getConnections(useLocalUserDirName);

  let targetUserConnection = connectionStore.find(
    (e) => e.userId === userId && e.selfTabId === selfTabId
  );

  if (!targetUserConnection) {
    // 创建实例
    targetUserConnection = new UserConnection({
      userId,
      useLocalUserDirName,
      selfTabId: selfTabId,
    });

    // 添加到连接存储
    connectionStore.push(targetUserConnection);
  }

  // Safari兼容性检查
  if (typeof RTCPeerConnection === "undefined") {
    console.error("当前浏览器不支持WebRTC");
    return targetUserConnection;
  }

  return targetUserConnection;
};

// 连接目标设备
export const connect = ({ userId, selfTabId, useLocalUserDirName }) => {
  const targetUserConnection = getConnection({
    userId,
    selfTabId,
    useLocalUserDirName,
  });

  targetUserConnection.connect();

  return targetUserConnection;
};

// 获取连接存储
export const getConnectionStore = (useLocalUserDirName) => {
  return getConnections(useLocalUserDirName);
};
