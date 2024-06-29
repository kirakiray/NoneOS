import resposeFS from "./resp-fs.js";

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const { pathname } = new URL(request.url);

  if (/^\/\$/.test(pathname)) {
    event.respondWith(
      (async () => {
        try {
          return await resposeFS({ request });
        } catch (err) {
          console.error(err);
          return new Response(undefined, {
            status: 404,
          });
        }
      })()
    );
  }

  console.log("pathname9", pathname);
});

self.addEventListener("install", () => {
  self.skipWaiting();

  console.log("NoneOS installation successful");
});

self.addEventListener("activate", () => {
  console.log("NoneOS server activation successful");
});
