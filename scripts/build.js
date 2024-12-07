import { createWriteStream } from "fs";
import archiver from "archiver";
import { promises as fs } from "fs";
import path from "path";

(async () => {
  // 写入版本号文件
  let packagejson = await fs.readFile("./package.json");
  packagejson = JSON.parse(packagejson);

  await fs.writeFile(
    "./packages/package.json",
    JSON.stringify({
      name: "NoneOS",
      version: packagejson.version,
    }),
    "utf-8"
  );

  await zipDirectory("./packages", "./packages.zip");

  // await fs.rm("./packages/package.json");
})();

async function zipDirectory(source, out) {
  const archive = archiver("zip", { zlib: { level: 9 } });

  const stream = createWriteStream(out);

  return new Promise((resolve, reject) => {
    archive
      .directory(source, false)
      .on("error", (err) => reject(err))
      .pipe(stream);

    stream.on("close", () => resolve());
    archive.finalize();
  });
}

async function copyFiles(sourceDir, targetDir) {
  try {
    await fs.access(targetDir);
  } catch (err) {
    await fs.mkdir(targetDir, { recursive: true });
  }

  let files = await fs.readdir(sourceDir);

  for (let file of files) {
    if (/^\./.test(file)) {
      continue;
    }

    let sourcePath = path.join(sourceDir, file);
    let targetPath = path.join(targetDir, file);

    const stat = await fs.stat(sourcePath);

    if (stat.isFile()) {
      await fs.copyFile(sourcePath, targetPath);
    } else if (stat.isDirectory()) {
      await copyFiles(sourcePath, targetPath);
    }
  }
}
