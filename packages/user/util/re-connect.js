const reconnectTimerSym = Symbol("reconnectTimer");

// 进行重连
export const checkAllConnection = (localUser, options) => {
  clearTimeout(localUser[reconnectTimerSym]);
  localUser[reconnectTimerSym] = setTimeout(async () => {
    for (const url of Object.keys(localUser.serverConnects)) {
      const serverClient = await localUser.serverConnects[url];

      if (serverClient.state === "closed" || serverClient.state === "error") {
        // 初始化失败的，重新再来
        serverClient.socket = null;
        await serverClient.init();
      }
    }

    // 检查所有设备
    for (const deviceId of Object.keys(localUser.remotes)) {
      try {
        const remoteUser = await localUser.remotes[deviceId];

        if (remoteUser.mode === 0) {
          // 再重新检查服务器状态
          await remoteUser.checkServer();
        }

        if (remoteUser.mode === 1) {
          // 再重新检查状态
          await remoteUser.refreshMode();
        }
      } catch (err) {
        console.log("检查设备失败", err);
        debugger;
        continue;
      }
    }

    if (options && options.loop) {
      // 循环检查
      setTimeout(() => {
        checkAllConnection(localUser, options);
      }, 5000);
    }
  }, 100);
};
