import { unzip } from "../zip/main.js";
import { get } from "../fs/handle/index.js";

// 安装系统依赖文件
export const installOS = async (callback, packagesUrl = "/packages.zip") => {
  // 缓存 packages
  const zipFile = await fetch(packagesUrl).then((e) => e.blob());
  const files = await unzip(zipFile);

  const packagesHandle = await get("packages");

  const { length } = files;
  let count = 0;

  // 标识安装中
  localStorage.__installing = 1;

  for (let { path, file } of files) {
    const fileHandle = await packagesHandle.get(path, {
      create: "file",
    });
    await fileHandle.write(file);
    count++;

    if (callback) {
      await callback({ count, length });
    }
  }

  localStorage.removeItem("__installing");

  return true;
};
