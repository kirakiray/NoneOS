import { test, expect } from "@playwright/test";
import { testSucceedCount } from "../../specUtil.js";

test.describe("GetHash Function Tests", () => {
  test("GetHash All", async ({ page }) => {
    await page.goto("/tests/fs/util/getHash.html");

    await testSucceedCount(page, 4);
  });
});
