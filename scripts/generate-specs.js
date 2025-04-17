import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 根目录路径 (scripts 的上一级)
const rootDir = path.join(__dirname, '..');
const testsDir = path.join(rootDir, 'tests');

// 递归遍历目录查找 *.ok.html 文件
async function findOkHtmlFiles(dir) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  let results = [];

  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      const subDirResults = await findOkHtmlFiles(fullPath);
      results = [...results, ...subDirResults];
    } else if (file.name.endsWith('.ok.html')) {
      results.push(fullPath);
    }
  }

  return results;
}

// 计算测试用例数量
async function countTestCases(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const testRegex = /await\s+test\s*\(\s*["'](.+?)["']\s*,\s*async/g;
  
  let match;
  let count = 0;
  
  while ((match = testRegex.exec(content)) !== null) {
    count++;
  }
  
  return count;
}

// 生成 spec.js 文件
async function generateSpecFile(okHtmlPath, testCount) {
  const dir = path.dirname(okHtmlPath);
  const baseName = path.basename(okHtmlPath, '.ok.html');
  const specPath = path.join(dir, `${baseName}.spec.js`);
  
  // 获取相对于根目录的路径，用于 page.goto()
  const relativePath = path.relative(rootDir, okHtmlPath).replace(/\\/g, '/');
  
  const specContent = `import { test, expect } from "@playwright/test";

test("${baseName} Test", async ({ page }) => {
  await page.goto("${relativePath}");

  // 每个案例记得更新这个值
  const count = ${testCount};

  // 等待出现 All tests completed 元素
  await page.getByTestId("test-completion-notification").click();

  // 获取所有测试用例
  const testCases = await page.$$("test-case");

  // 验证测试用例数量
  expect(await testCases.length).toBe(count);

  // 验证每个测试用例都成功执行
  let id = 0;
  for (const testCase of testCases) {
    id++;
    const successMark = await testCase.$(".success");
    expect(successMark, \`测试用例 #\${id} 执行失败\`).not.toBeNull();
  }
});
`;

  await fs.writeFile(specPath, specContent, 'utf-8');
  console.log(`已生成: ${specPath} (测试用例数: ${testCount})`);
}

// 主函数
async function main() {
  try {
    const okHtmlFiles = await findOkHtmlFiles(testsDir);
    console.log(`找到 ${okHtmlFiles.length} 个 .ok.html 文件`);
    
    for (const filePath of okHtmlFiles) {
      const testCount = await countTestCases(filePath);
      await generateSpecFile(filePath, testCount);
    }
    
    console.log('所有 spec.js 文件生成完成！');
  } catch (error) {
    console.error('发生错误:', error);
  }
}

main();