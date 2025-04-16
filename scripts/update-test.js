import { promises as fs } from "fs";
import { join, relative } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function findOkHtmlFiles(dir) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  let results = [];

  for (const file of files) {
    const fullPath = join(dir, file.name);
    if (file.isDirectory()) {
      results = results.concat(await findOkHtmlFiles(fullPath));
    } else if (file.name.endsWith(".ok.html")) {
      const relativePath = "../" + relative(process.cwd(), fullPath);
      results.push(relativePath.replace(/\\/g, "/"));
    }
  }

  return results;
}

async function updateConfigs() {
  try {
    const okHtmlFiles = await findOkHtmlFiles(".");
    const configPath = `${join(__dirname, "..", "tests")}/configs.json`;
    const config = { cases: okHtmlFiles };

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    console.log("configs.json 已更新，找到以下文件：");
    console.log(okHtmlFiles);
  } catch (error) {
    console.error("更新失败：", error);
  }
}

updateConfigs();
