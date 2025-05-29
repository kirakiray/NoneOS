import { getContentType, getFile } from "./util.js";

// 响应文件相关的请求
const resposeFs = (event) => {
  const { request } = event;
  let { pathname, origin, searchParams } = new URL(request.url);
  pathname = decodeURIComponent(pathname);

  const paths = pathname.split("/");
  const filepath = [paths[1].replace("$", ""), ...paths.slice(2)].join("/");

  // 改用直接的 opfs 读取文件方法
  event.respondWith(
    (async () => {
      try {
        // 获取文件
        const fileHandle = await getFile(filepath);

        const prefix = pathname.split(".").pop();

        return new Response(await fileHandle.getFile(), {
          status: 200,
          headers: {
            "Content-Type": getContentType(prefix),
          },
        });
      } catch (err) {
        return new Response(err.stack || err.toString(), {
          status: 400,
        });
      }
    })()
  );
};
export default resposeFs;
