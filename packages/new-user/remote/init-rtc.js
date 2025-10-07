// WebRTC ICE 服务器配置
const iceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com" },
];

export default async function initRTC(remoteUser) {
  if (remoteUser.serverState === 0) {
    throw new Error("未找到合适的握手服务器");
  }

  // 创建 RTCPeerConnection 实例
  const rtcConnection = new RTCPeerConnection({ iceServers });

  // 保存到 remoteUser 实例中
  remoteUser._rtcConnection = rtcConnection;

  // 创建数据通道
  const dataChannel = rtcConnection.createDataChannel("message");
  remoteUser._dataChannels.push(dataChannel);

  // 监听数据通道打开事件
  dataChannel.onopen = () => {
    // 更新连接模式为点对点模式
    remoteUser._changeMode(2);
  };

  const refreshDataChannels = () => {
    // 从 remoteUser 实例中移除该数据通道
    const index = remoteUser._dataChannels.indexOf(dataChannel);
    if (index !== -1) {
      remoteUser._dataChannels.splice(index, 1);
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

  // 监听数据通道关闭事件
  dataChannel.onclose = () => {
    console.log("RTC 数据通道已关闭");

    refreshDataChannels();
  };

  // 监听数据通道错误事件
  dataChannel.onerror = (error) => {
    console.error("RTC 数据通道错误:", error);

    refreshDataChannels();
  };

  // 监听 ICE 候选者事件
  rtcConnection.onicecandidate = (event) => {
    if (event.candidate) {
      // 通过服务器转发 ICE 候选者信息
      _sendIceCandidate(remoteUser, event.candidate);
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
    remoteUser._dataChannels.push(channel);

    channel.onmessage = (event) => {
      // 处理接收到的消息
      _handleReceivedMessage(remoteUser, event.data);
    };

    channel.onopen = () => {
      console.log("远程数据通道已打开");
    };

    channel.onclose = () => {
      console.log("远程数据通道已关闭");
      refreshDataChannels();
    };
  };

  // 创建并发送 offer
  try {
    const offer = await rtcConnection.createOffer();
    await rtcConnection.setLocalDescription(offer);

    // 通过服务器转发 offer
    _sendOffer(remoteUser, offer);
  } catch (error) {
    console.error("创建 RTC offer 失败:", error);
    // 如果有服务器连接，则回退到服务器转发模式
    if (remoteUser.serverState) {
      remoteUser._changeMode(1);
    } else {
      remoteUser._changeMode(0);
    }
  }
}

// 发送 ICE 候选者信息
function _sendIceCandidate(remoteUser, candidate) {
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

  const server = servers[0];
  server.sendTo(remoteUser.userId, {
    type: "rtc-ice-candidate",
    candidate: JSON.stringify(candidate),
  });
}

// 发送 offer
function _sendOffer(remoteUser, offer) {
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
  });
}

// 发送 answer
function _sendAnswer(remoteUser, answer) {
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
  server.sendTo(remoteUser.userId, {
    type: "rtc-answer",
    answer: JSON.stringify(answer),
  });
}

function _handleReceivedMessage(remoteUser, data) {
  try {
    const message = JSON.parse(data);
    console.log("收到消息:", message);
  } catch (e) {
    console.error("解析消息失败:", e);
  }

  debugger;
}
