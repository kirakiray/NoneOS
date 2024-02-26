export default (async () => {
  const packagesUrl = import.meta.url.replace(/(.+)\/.+/, "$1");

  // 初始化逻辑
  lm.config({
    alias: {
      "@puiroot": `${packagesUrl}`,
      "@pui": `${packagesUrl}/packages`,
    },
  });

  // const targetLink = $(`link[href*="${packagesUrl}/packages/css/public.css"]`);

  // if (!targetLink) {
  //   $("head").push(
  //     `<link rel="stylesheet" href="${packagesUrl}/packages/css/public.css">`
  //   );
  // }
})();
