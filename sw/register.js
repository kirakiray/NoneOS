const registration = navigator.serviceWorker.register("/sw.js", {
  // type: "module",
});

setTimeout(async () => {
  try {
    const reg = await registration;

    setTimeout(() => {
      // 定时更新
      reg.update();
    }, 60 * 60 * 1000);
  } catch (err) {
    console.error(err);
  }
}, 100);

export { registration };

/**
 * 等待 Service Worker 注册完成并激活
 * @returns {Promise<ServiceWorkerRegistration>} 返回一个 Promise，当 Service Worker 激活后 resolve
 */
export const ready = async () => waitForActivation(registration);

/**
 * 等待给定的 registration 真正完成（即对应的 Service Worker 进入 activated 状态）
 * 如果已经激活，立即 resolve；否则监听直到激活。
 * @param {ServiceWorkerRegistration} registration
 * @returns {Promise<ServiceWorkerRegistration>}
 */
async function waitForActivation(registration) {
  // 情况 1：已激活且当前页面已受控
  if (
    registration.active &&
    navigator.serviceWorker.controller === registration.active
  ) {
    return registration;
  }

  // 情况 2：正在安装/等待中，监听 statechange
  const worker = registration.installing || registration.waiting;
  if (worker) {
    return new Promise((resolve) => {
      const onStateChange = () => {
        if (worker.state === "activated") {
          worker.removeEventListener("statechange", onStateChange);
          resolve(registration);
        }
      };
      worker.addEventListener("statechange", onStateChange);
    });
  }

  // 情况 3：理论上不会走到这里，保险起见直接返回
  return registration;
}
