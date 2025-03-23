import { test, expect } from "@playwright/test";
import { testSucceedCount } from "../specUtil.js";

test.describe("User Tests", () => {
  test("Certificate generation and verification tests", async ({ page }) => {
    await page.goto("/tests/user/util.html");
    await testSucceedCount(page, 3);
  });

  test("User data signing and verification tests", async ({ page }) => {
    await page.goto("/tests/user/main.html");
    await testSucceedCount(page, 4);
  });

  test("Handshake server friend finding tests", async ({ page, browserName }) => {
    // test.skip(browserName === 'webkit', '在 Safari 上跳过此测试');
    await page.goto("/tests/user/handserver.html");
    await testSucceedCount(page, 2);
  });

  test("Agent data transfer tests", async ({ page, browserName }) => {
    // test.skip(browserName === 'webkit', '在 Safari 上跳过此测试');
    await page.goto("/tests/user/agent-data.html");
    await testSucceedCount(page, 6);
  });
});
