import get from "../fs/get.js";
import { getContentType } from "./util.js";

const resposeFS = async ({ request }) => {
  const { pathname } = new URL(request.url);

  const path = pathname.replace(/^\/\$\//, "");

  // console.log("path:", path);
  const handle = await get(decodeURIComponent(path));
  let content = await handle.file();

  const headers = {};

  const prefix = path.split(".").pop();

  headers["Content-Type"] = getContentType(prefix);

  return new Response(content, {
    status: 200,
    headers,
  });
};

export default resposeFS;
