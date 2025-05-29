import { test, expect } from "@playwright/test";

test("write-and-get Test", async ({ page }) => {
  await page.goto("tests/fs/handle/write-and-get.ok.html");

  // 每个案例记得更新这个值
  const count = 3;

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
    expect(successMark, `测试用例 #${id} 执行失败`).not.toBeNull();
  }
});
