import RTCAgent from "./RTCAgent.mjs";

async function wrap(func, event, urldata) {
  const { searchParams } = urldata;

  const query = Object.fromEntries(searchParams.entries());

  event.respondWith(
    (async () => {
      const data = await func({ query });

      return new Response(data, {
        status: 200,
      });
    })()
  );
}

export function fetch({ urldata, event }) {
  const place = urldata.pathname.replace("/api/connector/", "");

  switch (place) {
    case "init":
      wrap(init, event, urldata);
      break;
  }
  console.log("ha => ", urldata, event);
}

async function init({ query }) {
  return JSON.stringify(query);
}
