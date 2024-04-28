const packagesUrl = import.meta.url.replace(/(.+)\/.+/, "$1");

// 初始化逻辑
lm.config({
  alias: {
    "@puiroot": `${packagesUrl}`,
    "@pui": `${packagesUrl}/packages`,
  },
});

const targetLink = $(`link[href*="${packagesUrl}/packages/css/public.css"]`);

if (!targetLink) {
  const themeLink = $(`link[pui-theme]`);

  if (themeLink) {
    themeLink.before(
      `<link rel="stylesheet" href="${packagesUrl}/packages/css/public.css">`
    );
  } else {
    $("head").push(
      `<link rel="stylesheet" href="${packagesUrl}/packages/css/public.css">`
    );
  }
}
