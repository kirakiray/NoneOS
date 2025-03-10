import { get } from "../packages/fs/main.js";

// 响应文件相关的请求
const resposeFs = (event) => {
  const { request } = event;
  const { pathname, origin, searchParams } = new URL(request.url);

  const paths = pathname.split("/");
  const filepath = [paths[1].replace("$", ""), ...paths.slice(2)].join("/");

  event.respondWith(
    (async () => {
      try {
        const fileHandle = await get(filepath);

        const prefix = pathname.split(".").pop();

        const headers = {};
        headers["Content-Type"] = getContentType(prefix);

        return new Response(await fileHandle.file(), {
          status: 200,
          headers,
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

export const getContentType = (prefix) => {
  switch (prefix) {
    case "html":
    case "htm":
    case "txt":
    case "md":
      return "text/plain; charset=utf-8";
    case "js":
    case "mjs":
      return "application/javascript; charset=utf-8";
    case "json":
      return "application/json; charset=utf-8";
    case "css":
      return "text/css; charset=utf-8";
    case "xml":
      return "application/xml; charset=utf-8";
    case "svg":
      return "image/svg+xml; charset=utf-8";
    case "csv":
      return "text/csv; charset=utf-8";
    case "ics":
      return "text/calendar; charset=utf-8";
    case "pdf":
      return "application/pdf; charset=utf-8";
    case "doc":
    case "docx":
      return "application/msword; charset=utf-8";
    case "xls":
    case "xlsx":
      return "application/vnd.ms-excel; charset=utf-8";
    case "ppt":
    case "pptx":
      return "application/vnd.ms-powerpoint; charset=utf-8";
    case "zip":
      return "application/zip; charset=utf-8";
    case "gz":
      return "application/gzip; charset=utf-8";
    case "tar":
      return "application/x-tar; charset=utf-8";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "bmp":
      return "image/bmp";
    case "ico":
      return "image/x-icon";
    case "webp":
      return "image/webp";
    case "bmp":
      return "image/bmp";
    case "mp3":
      return "audio/mpeg";
    case "wav":
      return "audio/wav";
    case "mp4":
    case "m4v":
      return "video/mp4";
    case "mov":
      return "video/quicktime";
    case "avi":
      return "video/x-msvideo";
    default:
      return "application/octet-stream";
  }
};
