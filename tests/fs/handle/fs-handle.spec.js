import { test, expect } from "@playwright/test";

test.describe("File System Handle Tests", () => {
  test("should write and read file correctly", async ({ page }) => {
    // 判断到是safari，直接跳过测试
    // BUG: https://github.com/microsoft/playwright/issues/18235
    const userAgent = await page.evaluate(() => navigator.userAgent);
    if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
      test.skip();
    }

    await page.goto("/tests/fs/handle/write-and-get.html");

    // 等待所有测试用例执行完成
    await page.waitForSelector(".test-case");

    // 获取所有测试用例
    const testCases = await page.$$(".test-case");

    // 验证测试用例数量
    expect(await testCases.length).toBe(3);

    // 验证每个测试用例都成功执行
    for (const testCase of testCases) {
      const successMark = await testCase.$(".success");
      expect(successMark).not.toBeNull();
    }
  });
});
