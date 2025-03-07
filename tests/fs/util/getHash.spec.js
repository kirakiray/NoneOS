import { test, expect } from "@playwright/test";

test.describe("GetHash Function Tests", () => {
  test("验证 GetHash 函数的所有功能", async ({ page }) => {
    await page.goto("/tests/fs/util/getHash.html");

    // 等待所有测试用例执行完成
    await page.waitForSelector(".test-case");

    // 获取所有测试用例
    const testCases = await page.$$(".test-case");

    // 验证测试用例数量
    expect(await testCases.length).toBe(4);

    // 验证每个测试用例都成功执行
    for (const testCase of testCases) {
      const successMark = await testCase.$(".success");
      expect(successMark).not.toBeNull();
    }
  });
});
