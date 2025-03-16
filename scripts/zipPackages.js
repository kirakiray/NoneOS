import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import JSZip from "jszip";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packagesDir = path.join(__dirname, "..", "packages");

// 递归获取目录下所有文件
async function getAllFiles(dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getAllFiles(fullPath)));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

// 压缩所有文件
async function zipPackages() {
  try {
    const files = await getAllFiles(packagesDir);
    const zip = new JSZip();

    // 添加文件到压缩包
    for (const filePath of files) {
      const fileContent = await fs.readFile(filePath);
      const relativePath = path.relative(packagesDir, filePath);
      zip.file(relativePath, fileContent);
    }

    // 读取 package.json 获取版本号
    const packageJsonPath = path.join(__dirname, "../package.json");
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));
    const version = packageJson.version;

    // 生成压缩包，设置时间戳为0以确保相同内容生成相同的压缩包
    const zipContent = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: {
        level: 9,
      },
      platform: "UNIX", // 统一使用UNIX格式，避免不同平台差异
      date: new Date(0), // 将所有文件的时间戳设置为0，确保相同内容生成相同的压缩包
    });

    // 确保 dist 目录存在
    const distDir = path.join(__dirname, "../dist");
    await fs.mkdir(distDir, { recursive: true });

    // 将压缩包写入文件
    const outputPath = path.join(distDir, `packages-${version}.zip`);
    await fs.writeFile(outputPath, zipContent);

    console.log(`已完成压缩，文件保存在: ${outputPath}`);
    console.log(`共压缩 ${files.length} 个文件`);
  } catch (error) {
    console.error("压缩文件时发生错误:", error);
  }
}

zipPackages();
