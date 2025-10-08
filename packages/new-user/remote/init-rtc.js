// WebRTC ICE 服务器配置
const iceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com" },
];

export default async function initRTC(remoteUser, answerOptions) {
  if (remoteUser.serverState === 0) {
    throw new Error("未找到合适的握手服务器");
  }

  // 创建 RTCPeerConnection 实例
  const rtcConnection = new RTCPeerConnection({ iceServers });
  rtcConnection._rtcId = Math.random().toString(32).slice(2);

  // 保存到 remoteUser 实例中
  remoteUser._rtcConnections.push(rtcConnection);

  rtcConnection._dataChannels = [];

  if (!answerOptions) {
    // 创建数据通道
    const channel = rtcConnection.createDataChannel("message");

    // 初始化数据通道
    initChannel(remoteUser, rtcConnection, channel);
  }

  // 监听 ICE 候选者事件
  rtcConnection.onicecandidate = (event) => {
    if (event.candidate) {
      // 通过服务器转发 ICE 候选者信息
      _sendIceCandidate(remoteUser, rtcConnection, event.candidate);
    }
  };

  // 监听连接状态变化
  rtcConnection.onconnectionstatechange = () => {
    console.log("RTC 连接状态:", rtcConnection.connectionState);

    if (rtcConnection.connectionState === "connected") {
      console.log("RTC 连接已建立");
      remoteUser._changeMode(2);
    } else if (
      rtcConnection.connectionState === "failed" ||
      rtcConnection.connectionState === "disconnected"
    ) {
      console.log("RTC 连接失败或断开");
      // 如果有服务器连接，则回退到服务器转发模式
      if (remoteUser.serverState) {
        remoteUser._changeMode(1);
      } else {
        remoteUser._changeMode(0);
      }
    }
  };

  // 监听远程数据通道事件
  rtcConnection.ondatachannel = (event) => {
    const channel = event.channel;

    // 初始化数据通道
    initChannel(remoteUser, rtcConnection, channel);
  };

  if (!answerOptions) {
    // 创建并发送 offer
    try {
      const offer = await rtcConnection.createOffer();
      await rtcConnection.setLocalDescription(offer);

      // 通过服务器转发 offer
      _sendOffer(remoteUser, rtcConnection, offer);
    } catch (error) {
      console.error("创建 RTC offer 失败:", error);
      // 如果有服务器连接，则回退到服务器转发模式
      if (remoteUser.serverState) {
        remoteUser._changeMode(1);
      } else {
        remoteUser._changeMode(0);
      }
    }
  } else {
    let { offer } = answerOptions;

    // 保存对方的 RTC ID
    rtcConnection.__oppositeRTCId = answerOptions.fromRTCId;

    // 设置远程描述
    try {
      if (typeof offer === "string") {
        offer = JSON.parse(offer);
      }

      await rtcConnection.setRemoteDescription(offer);

      // 创建 answer
      const answer = await rtcConnection.createAnswer();
      await rtcConnection.setLocalDescription(answer);

      _sendAnswer(remoteUser, rtcConnection, answer, answerOptions);
    } catch (error) {
      console.error("设置远程描述失败:", error);
      // 如果有服务器连接，则回退到服务器转发模式
      if (remoteUser.serverState) {
        remoteUser._changeMode(1);
      } else {
        remoteUser._changeMode(0);
      }
    }
  }
}

const initChannel = (remoteUser, rtcConnection, channel) => {
  rtcConnection._dataChannels.push(channel);

  // 监听数据通道打开事件
  channel.onopen = () => {
    // 更新连接模式为点对点模式
    remoteUser._changeMode(2);
  };

  channel.onmessage = (event) => {
    // 处理接收到的消息
    try {
      const message = JSON.parse(data);
      console.log("收到消息:", message);
      debugger;
    } catch (e) {
      console.error("解析消息失败:", e);
    }
  };

  // 监听数据通道关闭事件
  channel.onclose = () => {
    console.log("RTC 数据通道已关闭");

    refreshDataChannels(rtcConnection, channel);
  };

  // 监听数据通道错误事件
  channel.onerror = (error) => {
    console.error("RTC 数据通道错误:", error);

    refreshDataChannels(rtcConnection, channel);
  };
};

const refreshDataChannels = (rtcConnection, channel) => {
  // 从 remoteUser 实例中移除该数据通道
  const index = rtcConnection._dataChannels.indexOf(channel);
  if (index !== -1) {
    rtcConnection._dataChannels.splice(index, 1);
  }

  if (!remoteUser._dataChannels.length) {
    // 如果有服务器连接，则回退到服务器转发模式
    if (remoteUser.serverState) {
      remoteUser._changeMode(1);
    } else {
      remoteUser._changeMode(0);
    }
  }
};

// 发送 ICE 候选者信息
function _sendIceCandidate(remoteUser, rtcConnection, candidate) {
  if (!remoteUser.serverState) {
    console.error("没有可用的服务器连接，无法发送 ICE 候选者");
    return;
  }

  // 通过第一个可用的服务器发送 ICE 候选者
  const servers = remoteUser.servers;
  if (servers.length === 0) {
    console.error("没有可用的服务器连接，无法发送 ICE 候选者");
    return;
  }

  const sendIce = (toRtcId) => {
    const server = servers[0];

    server.sendTo(remoteUser.userId, {
      type: "rtc-ice-candidate",
      candidate: JSON.stringify(candidate),
      toRtcId,
      __internal_mark: 1,
    });
  };

  // 查看是否已经得到了answer
  if (rtcConnection._hasReceivedAnswer) {
    // 如果已经得到了answer，直接发送
    debugger;
    sendIce();
  } else {
    const pendingIceSends =
      rtcConnection._pendingIceSends || (rtcConnection._pendingIceSends = []);

    // 先记录等得到answer后再发送
    pendingIceSends.push(sendIce);
  }
}

// 发送 offer
function _sendOffer(remoteUser, rtcConnection, offer) {
  if (!remoteUser.serverState) {
    console.error("没有可用的服务器连接，无法发送 offer");
    return;
  }

  // 通过第一个可用的服务器发送 offer
  const servers = remoteUser.servers;
  if (servers.length === 0) {
    console.error("没有可用的服务器连接，无法发送 offer");
    return;
  }

  servers[0].sendTo(remoteUser.userId, {
    type: "rtc-offer",
    offer: JSON.stringify(offer),
    publicKey: remoteUser.self.publicKey, // 自身的公钥
    fromRTCId: rtcConnection._rtcId,
    __internal_mark: 1,
  });
}

// 发送 answer
function _sendAnswer(remoteUser, rtcConnection, answer, answerOptions) {
  if (!remoteUser.serverState) {
    console.error("没有可用的服务器连接，无法发送 answer");
    return;
  }

  // 通过第一个可用的服务器发送 answer
  const servers = remoteUser.servers;
  if (servers.length === 0) {
    console.error("没有可用的服务器连接，无法发送 answer");
    return;
  }

  const server = servers[0];
  server.sendTo(
    {
      userId: remoteUser.userId,
      userSessionId: answerOptions.fromUserSessionId,
    },
    {
      type: "rtc-answer",
      answer: JSON.stringify(answer),
      fromRTCId: rtcConnection._rtcId,
      toRtcId: answerOptions.fromRTCId,
      __internal_mark: 1,
    }
  );
}
