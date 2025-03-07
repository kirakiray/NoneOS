import { test, expect } from '@playwright/test';

test.describe('GetHash Function Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/fs-util/getHash.html');
  });

  test('验证 GetHash 函数的所有功能', async ({ page }) => {
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

    // 验证具体测试用例的存在和结果
    const expectedTests = [
      {
        name: 'Test String Input',
        hash: 'dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f'
      },
      {
        name: 'Test Empty String',
        hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      },
      {
        name: 'Test Blob Input',
        hash: '9f634430702b96598ef75225eb371ace8c1461e56fc9c55d9ed4b4a8b997b10a'
      },
      {
        name: 'Test ArrayBuffer Input',
        hash: '6976d91affad9df9ede28e08ed345fe6590a4e970b7f8dfd412835d794aeba25'
      }
    ];

    for (const test of expectedTests) {
      // 验证测试用例存在
      const testElement = await page.getByText(test.name);
      await expect(testElement).toBeVisible();

      // 验证具体哈希值
      const resultElement = await page.getByText(`Result: ${test.hash}`);
      await expect(resultElement).toBeVisible();
    }
  });
});