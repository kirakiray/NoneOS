import { test, expect } from "@playwright/test";
import { testSucceedCount } from "../specUtil.js";

test.describe("User Certificate Tests", () => {
  test("Certificate generation and verification tests", async ({ page }) => {
    await page.goto("/tests/user/util.html");

    // util.html 中包含了三个测试用例
    await testSucceedCount(page, 3);
  });
});