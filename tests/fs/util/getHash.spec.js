import { test, expect } from "@playwright/test";
import { testSucceedCount } from "../../specUtil.js";

test.describe("GetHash Function Tests", () => {
  test("验证 GetHash 函数的所有功能", async ({ page }) => {
    await page.goto("/tests/fs/util/getHash.html");

    await testSucceedCount(page, 4);
  });
});
