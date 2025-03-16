import { test, expect } from "@playwright/test";
import { testSucceedCount } from "../../specUtil.js";

test.describe("Util Function Tests", () => {
  test("Get Hash", async ({ page }) => {
    await page.goto("/tests/fs/util/getHash.html");

    await testSucceedCount(page, 4);
  });

  test("Get File Hash", async ({ page }) => {
    await page.goto("/tests/fs/util/getFileHash.html");

    await testSucceedCount(page, 4);
  });
});
