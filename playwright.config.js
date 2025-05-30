// @ts-check
import { defineConfig, devices } from "@playwright/test";

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./tests",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: "http://localhost:5559",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",

    serviceWorkers: "allow",

    // launchOptions: {
    //   args: ["--no-sandbox", "--disable-setuid-sandbox"],
    // },
  },
  // 设置全局超时时间为3秒
  timeout: 5000,

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    // playwright中的 webkit 不支持 storage-access 权限，因此无法使用
    // 解决方法：使用自带的 Safari 浏览器，打开 http://localhost:5559/tests/collector.html 进行测试
    // {
    //   name: "webkit",
    //   use: {
    //     ...devices["iPad Pro 11 landscape"],
    //     // ...devices["Desktop Safari"],
    //     // permissions: ["storage-access"],
    //   },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // 启动本地开发服务器配置
  // webServer: {
  //   // 启动服务器的命令，需要确保package.json中有对应的script
  //   command: "npm run static",
  //   // 服务器地址
  //   url: "http://localhost:5559",
  //   // 非CI环境下复用已存在的服务器
  //   reuseExistingServer: !process.env.CI,
  // },
});
