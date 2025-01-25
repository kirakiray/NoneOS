import { zips } from "/packages/libs/zip/main.js";

// 导入文件夹压缩包数据
export async function handleToZip(handler) {
  const files = await flatFiles(handler, (await handler.parent()).path + "/");

  const zipFile = await zips(files);

  return zipFile;
}

export async function flatFiles(parHandle, rootPath) {
  const files = [];

  for await (let [name, handle] of parHandle.entries()) {
    if (handle.kind === "file") {
      const path = handle.path.replace(rootPath, "");

      files.push({
        path,
        file: await handle.file(),
      });
    } else {
      const subFiles = await flatFiles(handle, rootPath);
      files.push(...subFiles);
    }
  }

  return files;
}
