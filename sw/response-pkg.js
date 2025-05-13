export default async function resposePkg(event) {
  const { request } = event;
  const { pathname, origin, searchParams } = new URL(request.url);

  if (/\.napp\/$/.test(pathname)) {
    respNapp(event);
    return;
  }
}

export const respNapp = async (event) => {
  const { request } = event;
  const { pathname, origin, searchParams } = new URL(request.url);

  let iconName = "icon.svg";

  event.respondWith(
    (async () => {
      // 获取应用名
      let appName = "App";
      try {
        const appData = await fetch(`${pathname}app.json`).then((e) =>
          e.json()
        );

        iconName = appData.icon || iconName;

        appName =
          appData.name ||
          pathname
            .split("/")
            .filter((e) => /\.napp$/.test(e))
            .slice(-1)[0]
            .replace(/\.napp$/, "");
      } catch (e) {}

      const content = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${appName}</title>
    <link rel="icon" href="./${iconName}">
    <link rel="stylesheet" href="/packages/others/colors.css" pui-colors />
    <script src="/packages/libs/ofa/ofa.js"></script>
    <script src="/packages/libs/ofa/router.min.js"></script>
    <script src="/packages/pui/public/init.js" type="module"></script>
    <script src="/packages/none-os/init.js" type="module"></script>
  </head>
  <body>
    <o-router fix-body>
      <o-app src="./app-config.js"></o-app>
    </o-router>
  </body>
</html>`;

      return new Response(content, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
      });
    })()
  );
};
