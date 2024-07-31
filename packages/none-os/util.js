import { unzip } from "../zip/main.js";

// 安装系统
export const installOS = async () => {
  const zipFile = await fetch("/packages.zip").then((e) => e.blob());
  const files = await unzip(zipFile);

  console.log("files: ", files);
};
