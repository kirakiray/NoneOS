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

    await page.goto("tests/fs/handle/write-and-get.html");

    await testSucceedCount(page, 3);
  });

  test("fetch test", async ({ page }) => {
    await page.goto("tests/fs/handle/fetch.html");

    await testSucceedCount(page, 1);
  });

  test("Normal test", async ({ page }) => {
    await page.goto("tests/fs/handle/normal.html");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    await testSucceedCount(page, 4);
  });

  test("Some test", async ({ page }) => {
    await page.goto("tests/fs/handle/some.html");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    await testSucceedCount(page, 1);
  });

  test("Values test", async ({ page }) => {
    await page.goto("tests/fs/handle/values.html");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    await testSucceedCount(page, 1);
  });

  test("Flat test", async ({ page }) => {
    await page.goto("tests/fs/handle/flat.html");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    await testSucceedCount(page, 1);
  });

  test("Remove test", async ({ page }) => {
    await page.goto("tests/fs/handle/flat.html");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    await testSucceedCount(page, 1);
  });

  test("CopyTo test", async ({ page }) => {
    await page.goto("tests/fs/handle/copy-to.html");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    await testSucceedCount(page, 4);
  });

  test("MoveTo test", async ({ page }) => {
    await page.goto("tests/fs/handle/move-to.html");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    await testSucceedCount(page, 4);
  });
});
