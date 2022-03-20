if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("../sw.js")
    .then((reg) => {
      setTimeout(() => {
        // 一小时后自动更新
        reg.update();
      }, 60 * 60 * 1000);
    })
    .catch((err) => {});
}