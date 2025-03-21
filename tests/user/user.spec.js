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
});
