import { test, expect } from "@playwright/test";

export const testSucceedCount = async (page, count) => {
  // 等待所有测试用例执行完成
  await page.waitForSelector(".test-case");

  // 等待直到出现指定数量的测试用例
  await page.waitForFunction(
    (expectedCount) => {
      const testCases = document.querySelectorAll(".test-case");
      return testCases.length >= expectedCount;
    },
    count,
    { timeout: 5000 } // 设置超时时间为5秒
  );

  // 获取所有测试用例
  const testCases = await page.$$(".test-case");

  // 验证测试用例数量
  expect(await testCases.length).toBe(count);

  // 验证每个测试用例都成功执行
  for (const testCase of testCases) {
    const successMark = await testCase.$(".success");
    expect(successMark).not.toBeNull();
  }
};
