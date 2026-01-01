import { getContentType, getFile } from "./util.js";
import { loadHandle } from "../packages/fs/handle/mount/db.js";

// 响应文件相关的请求
const resposeFs = (event) => {
  const { request } = event;
  let { pathname, origin, searchParams } = new URL(request.url);
  pathname = decodeURIComponent(pathname);

  // 检查路径是否以 $mount- 开头
  if (pathname.startsWith("/$mount-")) {
    return responseMountedFs(event);
  }

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

// 返回$mount-开头的文件
const responseMountedFs = (event) => {
  const { request } = event;
  let { pathname, origin, searchParams } = new URL(request.url);
  pathname = decodeURIComponent(pathname);

  const mountedId = pathname.replace(/\/\$mount\-(.+):.+/, "$1");
  const pathsArr = pathname.split("/").slice(2);

  // 改用直接的 opfs 读取文件方法
  event.respondWith(
    (async () => {
      try {
        const rootHandle = await loadHandle(mountedId);

        if (!rootHandle) {
          throw new Error(`Mounted ID ${mountedId} not found`);
        }

        let finalHandle = rootHandle;
        for (let i = 0; i < pathsArr.length; i++) {
          const part = pathsArr[i];
          const isLast = i === pathsArr.length - 1;
          if (isLast) {
            finalHandle = await finalHandle.getFileHandle(part);
          } else {
            finalHandle = await finalHandle.getDirectoryHandle(part);
          }
        }

        const prefix = pathname.split(".").pop();

        return new Response(await finalHandle.getFile(), {
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
