export const ping = async ({
  fromUserId,
  fromUserSessionId,
  data,
  server,
  localUser,
}) => {
  const remoteUser = await localUser.connectUser(fromUserId);

  remoteUser.post(
    {
      type: "pong",
      __internal_mark: 1,
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

  clearTimeout(remoteUser.__pingTimeout);
  if (remoteUser.__pingTime) {
    const delay = Date.now() - remoteUser.__pingTime;
    remoteUser.pushDelays({
      time: remoteUser.__pingTime,
      delay,
    });

    remoteUser.__pingTime = null;

    if (remoteUser.__pingLoop) {
      remoteUser.__pingLoopTimeout = setTimeout(
        () => {
          remoteUser.ping();
        },
        remoteUser.__pingLoop < 5000 ? 5000 : remoteUser.__pingLoop
      );
    }
  }
};
