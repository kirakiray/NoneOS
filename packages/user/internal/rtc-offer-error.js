export default async ({
  fromUserId,
  fromUserSessionId,
  data,
  server,
  localUser,
}) => {
  // 获取目标的远端用户
  const remoteUser = await localUser.connectUser({
    userId: fromUserId,
    fromUserId,
  });

  remoteUser.dispatchEvent(
    new CustomEvent("init-rtc-error", {
      detail: {
        fromUserId,
        fromUserSessionId,
        toRTCId: data.toRTCId,
        message: data.message,
      },
    })
  );
};
