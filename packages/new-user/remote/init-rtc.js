import { toData } from "../util/buffer-data.js";

// WebRTC ICE 服务器配置
const iceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com" },
];

export default async function initRTC(remoteUser, rtcOptions) {
  if (remoteUser.serverState === 0) {
    throw new Error("未找到合适的握手服务器");
  }

  // 创建 RTCPeerConnection 实例
  const rtcConnection = new RTCPeerConnection({ iceServers });
  rtcConnection._rtcId = Math.random().toString(32).slice(2);

  // 保存到 remoteUser 实例中
  remoteUser._rtcConnections.push(rtcConnection);
  rtcConnection._dataChannels = [];

  // 初始化数据通道（仅在发起方时创建）
  if (!(rtcOptions && rtcOptions.offer)) {
    const channel = rtcConnection.createDataChannel("message");
    initChannel(remoteUser, rtcConnection, channel);
  }

  // 监听 ICE 候选者事件
  rtcConnection.onicecandidate = (event) => {
    if (event.candidate) {
      _sendIceCandidate(remoteUser, rtcConnection, event.candidate, rtcOptions);
    }
  };

  // 监听连接状态变化
  rtcConnection.onconnectionstatechange = () => {
    // console.log("RTC 连接状态:", rtcConnection.connectionState);

    // 派发连接状态变化事件
    remoteUser.dispatchEvent(
      new CustomEvent("rtc-state-change", {
        detail: {
          rtcId: rtcConnection._rtcId,
          connectionState: rtcConnection.connectionState,
        },
      })
    );

    // 根据连接状态处理
    switch (rtcConnection.connectionState) {
      case "connected":
        // console.log("RTC 连接已建立");
        break;
      case "failed":
      case "disconnected":
        console.log("RTC 连接失败或断开");
        cleanupRTCConnection(remoteUser, rtcConnection);
        handleConnectionError(remoteUser, null, "RTC连接");
        break;
    }
  };

  // 监听远程数据通道事件
  rtcConnection.ondatachannel = (event) => {
    initChannel(remoteUser, rtcConnection, event.channel);
  };

  // 根据是否为应答方执行不同逻辑
  if (!(rtcOptions && rtcOptions.offer)) {
    // 发起方：创建并发送 offer
    try {
      const offer = await rtcConnection.createOffer();
      await rtcConnection.setLocalDescription(offer);

      const targetOpts = {
        userId: remoteUser.userId,
      };

      if (rtcOptions?.userSessionId) {
        targetOpts.userSessionId = rtcOptions.userSessionId;
      }

      sendRTCMessage(
        remoteUser,
        {
          type: "rtc-offer",
          offer: JSON.stringify(offer),
          publicKey: remoteUser.self.publicKey,
          fromRTCId: rtcConnection._rtcId,
          __internal_mark: 1,
        },
        targetOpts
      );
    } catch (error) {
      handleConnectionError(remoteUser, error, "创建 RTC offer");
    }
  } else {
    // 应答方：处理 offer 并发送 answer
    try {
      let { offer } = rtcOptions;
      rtcConnection.__oppositeRTCId = rtcOptions.fromRTCId;
      rtcConnection.__oppositeUserSessionId = rtcOptions.fromUserSessionId;

      if (typeof offer === "string") {
        offer = JSON.parse(offer);
      }

      await rtcConnection.setRemoteDescription(offer);

      const answer = await rtcConnection.createAnswer();
      await rtcConnection.setLocalDescription(answer);

      sendRTCMessage(
        remoteUser,
        {
          type: "rtc-answer",
          answer: JSON.stringify(answer),
          fromRTCId: rtcConnection._rtcId,
          toRtcId: rtcOptions.fromRTCId,
          __internal_mark: 1,
        },
        {
          userId: remoteUser.userId,
          userSessionId: rtcOptions.fromUserSessionId,
        }
      );
    } catch (error) {
      handleConnectionError(remoteUser, error, "设置远程描述");
    }
  }
}

// 通用错误处理函数
const handleConnectionError = (remoteUser, error, action) => {
  console.error(`${action}失败:`, error);
  // 根据服务器状态切换模式

  remoteUser.checkState();
};

// 清理已关闭的RTC连接
const cleanupRTCConnection = (remoteUser, rtcConnection) => {
  // 关闭连接
  rtcConnection.close();

  // 从连接池中移除已关闭的连接
  const index = remoteUser._rtcConnections.indexOf(rtcConnection);
  if (index !== -1) {
    remoteUser._rtcConnections.splice(index, 1);
  }
};

// 发送 ICE 候选者信息
function _sendIceCandidate(remoteUser, rtcConnection, candidate, rtcOptions) {
  // 检查服务器连接状态
  if (!remoteUser.serverState) {
    console.error("没有可用的服务器连接，无法发送 ICE 候选者");
    return;
  }

  const servers = remoteUser.servers;
  if (servers.length === 0) {
    console.error("没有可用的服务器连接，无法发送 ICE 候选者");
    return;
  }

  const sendIce = (toRtcId) => {
    let userSessionId;

    if (rtcOptions?.userSessionId) {
      userSessionId = rtcOptions.userSessionId;
    }

    servers[0].sendTo(
      { userId: remoteUser.userId, userSessionId },
      {
        type: "rtc-ice-candidate",
        candidate: JSON.stringify(candidate),
        toRtcId,
        __internal_mark: 1,
      }
    );
  };

  // 根据是否已收到 answer 决定发送策略
  if (rtcConnection._hasReceivedAnswer) {
    sendIce(rtcConnection.__oppositeRTCId);
  } else {
    const pendingIceSends =
      rtcConnection._pendingIceSends || (rtcConnection._pendingIceSends = []);
    pendingIceSends.push(sendIce);
  }
}

// 通用消息发送函数（用于offer和answer）
const sendRTCMessage = (remoteUser, message, target) => {
  // 检查服务器连接状态
  if (!remoteUser.serverState) {
    console.error("没有可用的服务器连接，无法发送消息");
    return;
  }

  const servers = remoteUser.servers;
  if (servers.length === 0) {
    console.error("没有可用的服务器连接，无法发送消息");
    return;
  }

  // 发送消息
  if (target) {
    servers[0].sendTo(target, message);
  } else {
    servers[0].sendTo(remoteUser.userId, message);
  }
};

const initChannel = (remoteUser, rtcConnection, channel) => {
  rtcConnection._dataChannels.push(channel);

  // 监听数据通道事件
  channel.onopen = () => {
    // setTimeout(() => {
    // 等待数据通道打开后再检查状态
    remoteUser.checkState();
    // }, 100);
  };

  channel.onmessage = (event) => {
    let message = event.data;
    try {
      if (typeof message === "string") {
        message = JSON.parse(message);
      }
    } catch (e) {
      console.error("解析消息失败:", e);
      debugger;
    }

    if (message instanceof ArrayBuffer) {
      const { data, info } = toData(new Uint8Array(message));

      // 重组消息对象
      message = {
        ...info,
        data,
      };
    }

    remoteUser.self.dispatchEvent(
      new CustomEvent("rtc-message", {
        detail: {
          remoteUser,
          message,
          channel,
          rtcConnection,
        },
      })
    );
  };

  channel.onclose = () => {
    console.log("RTC 数据通道已关闭");
    refreshDataChannels(remoteUser, rtcConnection, channel);
  };

  channel.onerror = (error) => {
    console.error("RTC 数据通道错误:", error);
    refreshDataChannels(remoteUser, rtcConnection, channel);
  };
};

const refreshDataChannels = (remoteUser, rtcConnection, channel) => {
  // 从数据通道列表中移除已关闭的通道
  const index = rtcConnection._dataChannels.indexOf(channel);
  if (index !== -1) {
    rtcConnection._dataChannels.splice(index, 1);
  }

  // 如果没有数据通道了，清理连接并回退到服务器模式
  if (rtcConnection._dataChannels.length === 0) {
    cleanupRTCConnection(remoteUser, rtcConnection);
    handleConnectionError(remoteUser, null, "数据通道");
  }

  remoteUser.checkState();
};
