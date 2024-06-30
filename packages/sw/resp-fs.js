import { get } from "../fs/main.js";

const resposeFS = async ({ request }) => {
  const { pathname } = new URL(request.url);

  const path = pathname.replace(/^\/\$\//, "");

  console.log("path:", path);
  const handle = await get(path);
  const content = await handle.text();

  const headers = {};

  return new Response(content, {
    status: 200,
    headers,
  });
};

export default resposeFS;
