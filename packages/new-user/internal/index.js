import { getHash } from "../../fs/util.js";
import initRTC from "../remote/init-rtc.js";

// 内部操作相关的函数
export default {
  async "rtc-offer"({
    fromUserId,
    fromUserSessionId,
    data,
    server,
    localUser,
  }) {
    const { offer, publicKey, fromRTCId } = data;

    // 用户用户id是否有被篡改
    const hash = await getHash(publicKey);
    if (hash !== fromUserId) {
      console.error("用户用户id与公钥不匹配");
      // TODO: 应该记录错误日志，太多就要拉入黑名单
      return;
    }

    // TODO: 检查是否自己的设备，不是的话不能创建连接

    // 获取目标的远端用户
    const remoteUser = await localUser.connectUser({
      userId: fromUserId,
      fromUserId,
    });

    await initRTC(remoteUser, {
      offer,
      fromUserId,
      fromUserSessionId,
      fromRTCId,
    });
  },
  async "rtc-answer"({
    fromUserId,
    fromUserSessionId,
    data,
    server,
    localUser,
  }) {
    let { answer, fromRTCId, toRtcId } = data;

    // 获取目标的远端用户
    const remoteUser = await localUser.connectUser({
      userId: fromUserId,
      fromUserId,
    });

    const rtcConnection = remoteUser._rtcConnections.find(
      (conn) => conn._rtcId === toRtcId
    );

    if (rtcConnection.__oppositeRTCId) {
      console.error("RTC ID 不应该已存在，请检查连接状态", rtcConnection);
      return;
    }

    rtcConnection.__oppositeRTCId = fromRTCId;

    if (!rtcConnection) {
      console.error("未找到目标 RTC 连接");
      return;
    }

    if (typeof answer === "string") {
      answer = JSON.parse(answer);
    }

    await rtcConnection.setRemoteDescription(answer);

    // 发送准备好的ice候选者
    rtcConnection._pendingIceSends.forEach((sendIce) => {
      sendIce(fromRTCId);
    });

    rtcConnection._hasReceivedAnswer = true;
  },
  async "rtc-ice-candidate"({
    fromUserId,
    fromUserSessionId,
    data,
    server,
    localUser,
  }) {
    // 获取目标的远端用户
    const remoteUser = await localUser.connectUser({
      userId: fromUserId,
      fromUserId,
    });

    let { candidate, toRtcId } = data;

    const rtcConnection = remoteUser._rtcConnections.find(
      (conn) => conn._rtcId === toRtcId
    );

    if (!rtcConnection) {
      console.error("未找到目标 RTC 连接");
      return;
    }

    if (typeof candidate === "string") {
      candidate = JSON.parse(candidate);
    }

    await rtcConnection.addIceCandidate(candidate);
  },
};
