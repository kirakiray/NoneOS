export default async function rtcIceCandidateHandler({
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
}