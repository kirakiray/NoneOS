import { test, expect } from "@playwright/test";

export const testSucceedCount = async (page, count) => {
  // 等待所有测试用例执行完成
  await page.waitForSelector(".test-case");

  // 等待出现 All tests completed 的 h5 元素
  await await page.getByTestId("all-test-completed").click();

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
