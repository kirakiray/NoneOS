// 专门用于复制到远端设备中的方法
export const copyTo = async ({
  localUser,
  files,
  fromUserId,
  formSessionId,
  progress,
}) => {
  const remoteUser = await localUser.connectUser(fromUserId);

  debugger;
};

//
export const receive = async () => {
  debugger;

  return () => {};
};
