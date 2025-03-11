import { test, expect } from "@playwright/test";
import { testSucceedCount } from "../specUtil.js";

test.describe("Hybird Data Tests", () => {
  test("GetHash All", async ({ page }) => {
    await page.goto("/tests/hybird-data/save-and-get.html");

    await testSucceedCount(page, 1);
  });
});
