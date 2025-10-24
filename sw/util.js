// 读取文件
export const getFile = async (filepath) => {
  const opfsRoot = await navigator.storage.getDirectory();

  const paths = filepath.split("/");
  let currentPath = "";
  let currentDir = opfsRoot;
  while (paths.length > 1) {
    let dirName = decodeURIComponent(paths.shift());
    currentPath += `${dirName}/`;
    const dirHandle = await currentDir
      .getDirectoryHandle(dirName)
      .catch(() => null);
    if (!dirHandle) {
      throw new Error(`目录 ${currentPath} 不存在`);
    }
    currentDir = dirHandle;
  }
  // 获取文件
  const fileHandle = await currentDir
    .getFileHandle(decodeURIComponent(paths[0]))
    .catch(() => null);

  if (!fileHandle) {
    throw new Error(`文件 ${filepath} 不存在`);
  }

  return fileHandle;
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
