import { test, expect } from "@playwright/test";
import { testSucceedCount } from "../specUtil.js";

test.describe("Hybird Data Tests", () => {
  test("Save and get test", async ({ page }) => {
    await page.goto("/tests/hybird-data/save-and-get.html");

    await testSucceedCount(page, 1);
  });

  test("Auto update data test", async ({ page }) => {
    await page.goto("/tests/hybird-data/change-file.html");

    await testSucceedCount(page, 1);
  });
});
