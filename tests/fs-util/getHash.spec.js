import { test, expect } from '@playwright/test';

test.describe('GetHash Function Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/fs-util/getHash.html');
  });

  test('页面标题正确加载', async ({ page }) => {
    await expect(page).toHaveTitle('GetHash Function Test');
  });

  test('所有测试用例都应该成功执行', async ({ page }) => {
    // 等待所有测试用例执行完成
    await page.waitForSelector('.test-case');

    // 获取所有测试用例
    const testCases = await page.$$('.test-case');
    
    // 验证测试用例数量
    expect(await testCases.length).toBe(4);

    // 验证每个测试用例都成功执行
    for (const testCase of testCases) {
      const successMark = await testCase.$('.success');
      expect(successMark).not.toBeNull();
    }
  });

  test('验证具体测试用例的存在', async ({ page }) => {
    const expectedTests = [
      'Test String Input',
      'Test Empty String',
      'Test Blob Input',
      'Test ArrayBuffer Input'
    ];

    for (const testName of expectedTests) {
      const testElement = await page.getByText(testName);
      await expect(testElement).toBeVisible();
    }
  });

  test('验证哈希结果格式', async ({ page }) => {
    // 等待所有测试结果加载
    await page.waitForSelector('.test-case');

    // 获取所有结果文本
    const results = await page.$$eval('.test-case', elements => 
      elements.map(el => el.textContent.match(/Result: ([a-f0-9]+)/)?.[1])
    );

    // 验证每个结果都是64位的十六进制字符串
    for (const result of results) {
      expect(result).toMatch(/^[a-f0-9]{64}$/);
    }
  });
});