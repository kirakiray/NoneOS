(async () => {
  try {
    const reg = await navigator.serviceWorker.register(
      // navigator.userAgent.includes("Firefox") ? "sw-bundle.js" : "/sw.js",
      "/sw.js",
      {
        type: "module",
        scope: "/",
      }
    );

    setTimeout(() => {
      reg.update();
    }, 60 * 60 * 1000);
  } catch (err) {
    console.error(err);
  }
})();
