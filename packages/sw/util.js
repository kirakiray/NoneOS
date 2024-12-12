// export const cacheResponse = async (path) => {
//   const cache = await caches.open("noneos-default-cache");
//   let resp = await cache.match(path);

//   if (resp) {
//     return resp.clone();
//   }

//   resp = await fetch(path);

//   if (resp.status === 200) {
//     cache.put(path, resp.clone());
//   }

//   return resp;
// };

export const responseIndex = async () => {
  const text = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>NoneOS</title>
    <link rel="shortcut icon" href="/logo.png" />
    <link rel="apple-touch-icon" href="/logo.png" />
    <script src="/packages/libs/ofa/ofa.js"></script>
    <script src="/packages/libs/ofa/ofa-error-zh.js"></script>
    <link rel="stylesheet" href="/packages/pui/css/public.css" pui-theme-link />
    <link rel="stylesheet" href="/packages/others/colors.css" />
    <style>
      html,
      body {
        padding: 0;
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }
    </style>
  </head>
  <body>
    <l-m src="./packages/none-os/none-os.html"></l-m>
    <none-os></none-os>
    <script>
      navigator.serviceWorker.register("/sw.js");
    </script>
  </body>
</html>
`;

  return new Response(text, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
};

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
