import { test, expect } from "@playwright/test";
import { testSucceedCount } from "../../specUtil.js";

test.describe("Util Function Tests", () => {
  test("GetHash All", async ({ page }) => {
    await page.goto("/tests/fs/util/getHash.html");

    await testSucceedCount(page, 4);
  });
  
  test("Get file hash", async ({ page }) => {
    await page.goto("/tests/fs/util/getFileHash.html");

    await testSucceedCount(page, 4);
  });
});
