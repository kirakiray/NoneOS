export default async function rtcAnswerHandler({
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
  rtcConnection.__oppositeUserSessionId = fromUserSessionId;

  if (!rtcConnection) {
    console.error("未找到目标 RTC 连接");
    return;
  }

  if (typeof answer === "string") {
    answer = JSON.parse(answer);
  }

  await rtcConnection.setRemoteDescription(answer);

  // 发送准备好的ice候选者
  rtcConnection._pendingIceSends &&
    rtcConnection._pendingIceSends.forEach((sendIce) => {
      sendIce(fromRTCId);
    });

  rtcConnection._hasReceivedAnswer = true;
}
