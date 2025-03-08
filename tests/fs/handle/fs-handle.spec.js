import { test, expect } from "@playwright/test";
import { testSucceedCount } from "../../specUtil.js";

test.describe("File System Handle Tests", () => {
  test("should write and read file correctly", async ({ page }) => {
    // 判断到是safari，直接跳过测试
    // BUG: https://github.com/microsoft/playwright/issues/18235
    const userAgent = await page.evaluate(() => navigator.userAgent);
    if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
      test.skip();
    }

    await page.goto("/tests/fs/handle/write-and-get.html");

    await testSucceedCount(page, 3);
  });
});
