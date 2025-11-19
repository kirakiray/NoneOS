export const ping = async ({
  fromUserId,
  fromUserSessionId,
  data,
  server,
  localUser,
}) => {
  const remoteUser = await localUser.connectUser(fromUserId);

  if (remoteUser.mode === 0) {
    await remoteUser.checkServer();
  }

  remoteUser.post(
    {
      type: "pong",
      __internal_mark: 1,
      pingID: data.pingID,
    },
    fromUserSessionId
  );
};

export const pong = async ({
  fromUserId,
  fromUserSessionId,
  data,
  server,
  localUser,
}) => {
  const remoteUser = await localUser.connectUser(fromUserId);

  const pingTime = remoteUser._pingTimeMap.get(data.pingID);
  if (!pingTime) {
    console.log("pingID 不存在: ", data.pingID);
    return;
  }

  const delay = Date.now() - pingTime;
  remoteUser._pingTimeMap.clear();

  remoteUser.pushDelays({
    time: pingTime,
    delay,
  });
};
