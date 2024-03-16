(async () => {
  const cache = await caches.open("noneos-bootstrap");

  const resp = await cache.match("/");

  const osRoot = resp ? "/$/os" : "/os";

  addLink(`${osRoot}/core/publics/theme.css`, {
    "pui-theme": "",
  });

  await addScript(`${osRoot}/libs/ofa.min.js`, {
    debug: "",
  });

  $("body").push(`<l-m src="${osRoot}/comps/n-os/n-os.html"></l-m>`);

  await addScript(`${osRoot}/libs/Punch-UI/init.js`, {
    type: "module",
  });

  await addScript(`${osRoot}/init.js`, {
    type: "module",
  });
})();

navigator.serviceWorker
  .register(
    navigator.userAgent.includes("Firefox") ? "sw-bundle.js" : "/sw.js",
    {
      type: "module",
      scope: "/",
    }
  )
  .then((reg) => {
    // reg.update();
    setTimeout(() => {
      reg.update();
    }, 60 * 60 * 1000);
  })
  .catch((err) => {
    console.error(err);
  });

function addLink(href, options = {}) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;

  Object.entries(options).forEach(([name, value]) => {
    link.setAttribute(name, value);
  });

  document.head.appendChild(link);
}

function addScript(src, options = {}) {
  return new Promise((res) => {
    const script = document.createElement("script");
    script.src = src;

    Object.entries(options).forEach(([name, value]) => {
      script.setAttribute(name, value);
    });

    script.onload = () => {
      res();
      script.onload = null;
    };

    document.head.appendChild(script);
  });
}
