import { unzip } from "../zip/main.js";
import { get } from "../fs/main.js";

// 安装系统依赖文件
export const installOS = async (callback) => {
  const zipFile = await fetch("/packages.zip").then((e) => e.blob());
  const files = await unzip(zipFile);

  const packagesHandle = await get("packages");

  const { length } = files;
  let count = 0;

  for (let { path, file } of files) {
    const fileHandle = await packagesHandle.get(path, {
      create: "file",
    });
    await fileHandle.write(file);
    count++;

    if (length) {
      await callback({ count, length });
    }
  }

  return true;
};
