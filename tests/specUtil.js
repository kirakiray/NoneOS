import { test, expect } from "@playwright/test";

export const testSucceedCount = async (page, count) => {
  // 等待出现测试用例执行完成
  await page.waitForSelector(".test-case");

  // 等待出现 All tests completed 的 h5 元素
  await await page.getByTestId("all-test-completed").click();

  // 获取所有测试用例
  const testCases = await page.$$(".test-case");

  // 验证测试用例数量
  expect(await testCases.length).toBe(count);

  // 验证每个测试用例都成功执行
  let id = 0;
  for (const testCase of testCases) {
    id++;
    const successMark = await testCase.$(".success");
    expect(successMark, `测试用例 #${id} 执行失败`).not.toBeNull();
  }
};
