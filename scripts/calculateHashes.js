import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getFileHash } from '../packages/fs/util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packagesDir = path.join(__dirname, '..', 'packages');

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

// 计算所有文件的哈希值
async function calculateAllHashes() {
  try {
    const files = await getAllFiles(packagesDir);
    const results = [];

    for (const filePath of files) {
      const fileHandle = await fs.open(filePath, 'r');
      const fileStats = await fileHandle.stat();
      const file = new File(
        [await fs.readFile(filePath)],
        path.basename(filePath),
        { type: 'application/octet-stream' }
      );
      
      const hash = await getFileHash(file);
      const relativePath = path.relative(packagesDir, filePath);
      
      results.push({
        path: relativePath,
        hash,
        size: fileStats.size
      });
      
      await fileHandle.close();
    }

    // 将结果写入 JSON 文件
    const outputPath = path.join(__dirname, 'hashes.json');
    await fs.writeFile(
      outputPath,
      JSON.stringify(results, null, 2)
    );

    console.log(`已完成所有文件的哈希值计算，结果保存在: ${outputPath}`);
    console.log(`共处理 ${results.length} 个文件`);
  } catch (error) {
    console.error('计算哈希值时发生错误:', error);
  }
}

calculateAllHashes();