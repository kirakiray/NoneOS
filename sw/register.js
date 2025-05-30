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
