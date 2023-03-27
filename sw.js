import fs from "./packages/fs/index.mjs";
// import { fetch as connectorFetch } from "./packages/connector/sw-connector.mjs";

self.addEventListener("fetch", function (event) {
  const { request } = event;

  const urldata = new URL(request.url);

  if (/^\/@/.test(urldata.pathname)) {
    const path = urldata.pathname.replace(/^\/@/, "");

    event.respondWith(
      (async () => {
        try {
          const data = await fs.readFile(decodeURIComponent(path));

          if (!data) {
            throw `File does not exist : ${urldata.pathname}`;
          }

          return new Response(data, {
            status: 200,
          });
        } catch (err) {
          console.error(err);
          return new Response(undefined, {
            status: 404,
          });
        }
      })()
    );
  }

  // else if (/^\/api\/connector/.test(urldata.pathname)) {
  //   connectorFetch({
  //     urldata,
  //     event,
  //   });
  // }
});

self.addEventListener("install", () => {
  self.skipWaiting();

  console.log("NoneOS installation successful");
});

self.addEventListener("activate", () => {
  console.log("NoneOS server activation successful");
});
