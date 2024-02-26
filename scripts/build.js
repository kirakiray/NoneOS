import { createWriteStream } from "fs";
import archiver from "archiver";
import { promises as fs } from "fs";
import path from "path";

(async () => {
  // 复制基础库到os目录
  await copyFiles("../Punch-UI", "./os/libs/Punch-UI");
  await fs.copyFile("../ofa.js/dist/ofa.min.js", "./os/libs/ofa.min.js");

  // 写入版本号文件
  let packagejson = await fs.readFile("./package.json");
  packagejson = JSON.parse(packagejson);

  await fs.writeFile(
    "./os/package.json",
    JSON.stringify({
      version: packagejson.version,
    }),
    "utf-8"
  );

  zipDirectory("./os", "./os.zip");
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
