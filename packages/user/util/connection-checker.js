const reconnectTimerSym = Symbol("reconnectTimer");

let hidden = false;
let hasHidden = false;

document.addEventListener("visibilitychange", function () {
  if (document.hidden) {
    hidden = true;
    hasHidden = true;
  } else {
    hidden = false;
  }
});

window.addEventListener("blur", () => {
  hasHidden = true;
});

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
    // 最小化过，且重新打开了，需要重新检查
    if (hidden === false && !hasHidden) {
      await Promise.all(
        Object.keys(localUser.remotes).map(async (deviceId) => {
          try {
            const remoteUser = await localUser.remotes[deviceId];

            if (remoteUser.mode === 0) {
              // 再重新检查服务器状态
              await remoteUser.checkServer();
            }

            if (remoteUser.mode === 1) {
              // 再重新检查状态
              // await remoteUser.refreshMode();
            }
          } catch (err) {
            console.warn("检查设备失败：", deviceId, err);
          }
        })
      );
    }

    if (options && options.loop) {
      // 循环检查
      setTimeout(() => {
        checkAllConnection(localUser, options);
      }, 10000);
    }
  }, 100);
};
