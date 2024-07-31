import get from "../fs/get.js";

const resposeFS = async ({ request }) => {
  const { pathname } = new URL(request.url);

  const path = pathname.replace(/^\/\$\//, "");

  // console.log("path:", path);
  const handle = await get(path);
  let content = await handle.file();

  const headers = {};

  const prefix = path.split(".").pop();

  switch (prefix) {
    case "js":
    case "mjs":
      headers["Content-Type"] = "application/javascript; charset=utf-8";
      break;
    case "svg":
      headers["Content-Type"] = "image/svg+xml; charset=utf-8";
      break;
  }

  return new Response(content, {
    status: 200,
    headers,
  });
};

export default resposeFS;
