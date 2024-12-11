import fs from "fs/promises";
import path from "path";
import { createHash } from "crypto";

const MAX_CHUNK_SIZE = 1024 * 1024; // 1 MB in bytes

export function hashBufferChunks(buffer) {
  const chunks = [];
  for (let i = 0; i < buffer.length; i += MAX_CHUNK_SIZE) {
    chunks.push(buffer.slice(i, i + MAX_CHUNK_SIZE));
  }

  return chunks.map((chunk) => {
    const hash = createHash("sha256");
    hash.update(chunk);
    return hash.digest("hex"); // 返回十六进制字符串表示的哈希值
  });
}

async function getFilesAndHashes(dirPath) {
  let filesWithHashes = [];

  async function processDirectory(currentPath) {
    try {
      const files = await fs.readdir(currentPath, { withFileTypes: true });
      for (let dirent of files) {
        if (dirent.name === ".DS_Store") continue; // 跳过 .DS_Store 文件

        const fullPath = path.join(currentPath, dirent.name);

        if (dirent.isDirectory()) {
          // 递归处理子目录
          await processDirectory(fullPath);
        } else if (dirent.isFile()) {
          const fileData = await fs.readFile(fullPath);

          // 只处理文件，不处理目录，并计算哈希值
          const hashes = await hashBufferChunks(fileData);

          filesWithHashes.push({ path: fullPath, hashes });
        }
      }
    } catch (err) {
      console.error("Error processing directory:", err);
    }
  }

  // 开始处理指定的目录
  await processDirectory(dirPath);

  return filesWithHashes;
}

// 导出函数以便可以在其他模块中导入使用
export { getFilesAndHashes };
