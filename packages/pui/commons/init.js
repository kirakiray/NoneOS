if (!$.getRootProvider("pui")) {
  $("body").push(`
    <o-root-provider name="pui" theme="light"></o-root-provider>
  `);
}

const themeInited = getComputedStyle(document.body).getPropertyValue(
  "--pui-theme-inited"
);

if (!themeInited && !document.querySelector("link[pui-theme-link]")) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  //   link.href = import.meta.resolve("../css/public.css");
  link.href = new URL("../css/public.css", import.meta.url).href;
  link.setAttribute("pui-theme-link", "");
  document.head.appendChild(link);
}

setTimeout(() => {
  const puiRootProvider = $.getRootProvider("pui");

  let f;
  puiRootProvider.watchTick(
    (f = () => {
      if (puiRootProvider.theme === "dark") {
        $("html").classList.add("theme-dark-mode");
      } else if (puiRootProvider.theme === "light") {
        $("html").classList.remove("theme-light-mode");
      }

      localStorage.__pui_theme = puiRootProvider.theme || "auto";
    })
  );

  if (!puiRootProvider.theme) {
    puiRootProvider.theme = localStorage.__pui_theme;
  }

  f();
}, 0);
