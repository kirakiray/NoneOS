import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getFileHash } from "../packages/fs/util.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packagesDir = path.join(__dirname, "..", "packages");

// 递归获取目录下所有文件
async function getAllFiles(dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    // 跳过 demo 目录
    if (entry.isDirectory()) {
      if (entry.name === "demo") {
        continue;
      }
      files.push(...(await getAllFiles(fullPath)));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

// 计算所有文件的哈希值
async function calculateAllHashes() {
  try {
    const files = await getAllFiles(packagesDir);
    const results = [];

    for (const filePath of files) {
      // 忽略 node_modules 和 DS_Store 文件
      if (filePath.includes("node_modules") || filePath.includes("DS_Store")) {
        continue;
      }

      const fileContent = await fs.readFile(filePath);
      const fileStats = await fs.stat(filePath);

      const hash = await getFileHash(fileContent); // 直接传入文件内容
      const relativePath = path.relative(packagesDir, filePath);

      results.push({
        path: relativePath,
        hash,
        size: fileStats.size,
      });
    }

    // 读取根目录的 package.json
    const packageJsonPath = path.join(__dirname, "../package.json");
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));

    // 将结果写入 JSON 文件，包含版本信息
    const finalResults = {
      version: packageJson.version,
      files: results,
    };

    console.log(`共处理 ${results.length} 个文件`);

    return finalResults;
  } catch (error) {
    console.error("计算哈希值时发生错误:", error);
  }
}

import { signDataByPair } from "../scripts/sign-data.js";

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let rootJSON = null;

try {
  rootJSON = require("../rootkeys/root.json");
} catch (err) {
  console.error("没有 root.json");
}

const main = async () => {
  const outputPath = path.join(__dirname, "../dist/", "hashes.json");
  const result = await calculateAllHashes();

  let finnalResult = {
    data: result,
  };

  if (rootJSON) {
    finnalResult = await signDataByPair(
      { ...result },
      {
        publicKey: rootJSON.public,
        privateKey: rootJSON.private,
      }
    );
  }

  await fs.writeFile(outputPath, JSON.stringify(finnalResult));
  // await fs.writeFile(outputPath, JSON.stringify(result, null, 2));
  console.log(`已完成所有文件的哈希值计算，结果保存在: ${outputPath}`);
};

main();
