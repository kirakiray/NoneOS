// 专门用于复制到远端设备中的方法
export const copyTo = ({
  localUser,
  files,
  fromUserId,
  formSessionId,
  progress,
}) => {
  (async () => {
    const remoteUser = await localUser.connectUser(fromUserId);

    // 发送数据给对方
    remoteUser.post(
      {
        val: "haha",
      },
      {
        sessionId: formSessionId,
      }
    );
  })();
};

// 初始化接收器
export const initReceiver = ({ localUser, progress, handle }) => {
  return localUser.bind("receive-data", async (e) => {
    const { data, fromUserId, fromUserSessionId } = e.detail;

    // 确认对方是我的设备才进行操作
    const isMyDevice = await localUser.isMyDevice(fromUserId);

    if (!isMyDevice) {
      console.log("对方不是我的设备，不进行操作");
      // TODO: 不是设备要加入黑名单
      return;
    }

    debugger;
  });
};
