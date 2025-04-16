// 还是没有用。。。
import { webkit } from "playwright";
import path from 'path';

async function openGoogle() {
  console.log("正在启动 WebKit 浏览器...");


  // 启动 WebKit 浏览器
  const browser = await webkit.launch({
    headless: false, // 设置为 false 以显示浏览器界面
  });

  // 创建新的浏览器上下文，使用持久化存储
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    bypassCSP: true,
    storageState: {}, // 初始化空的存储状态
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15', // 设置标准用户代理
    userDataDir: './user-data-dir', // 使用定义的用户数据目录实现持久化存储
  });

  // 在上下文中创建新页面
  const page = await context.newPage();

  console.log("正在访问网页...");

  // 导航到指定页面
  await page.goto("http://localhost:5559/tests/fs/handle/normal.html");

  // // 等待页面加载完成
  // await page.waitForLoadState('domcontentloaded');

  // // 注入辅助脚本以启用 File System Access API
  // await page.addInitScript(() => {
  //   // 模拟用户交互，这对某些API的激活很重要
  //   window.addEventListener('DOMContentLoaded', () => {
  //     document.body.click();
  //   });
  // });

  console.log("已成功打开网页");

  // 等待用户手动关闭浏览器
  console.log("浏览器将保持打开状态，按 Ctrl+C 退出脚本");

  // 脚本将保持运行状态，直到用户按下 Ctrl+C 或关闭浏览器
}

// 执行函数并处理可能的错误
openGoogle().catch((error) => {
  console.error("发生错误:", error);
  process.exit(1);
});
