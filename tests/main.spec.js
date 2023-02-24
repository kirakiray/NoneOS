const { test, expect } = require("@playwright/test");

test("haha", async ({ page }) => {
  await page.goto("https://playwright.dev/");

  return await page.waitForFunction((e) => {
    return new Promise((res) => {
      setTimeout(() => res(111), 1000);
    });
  }, 111);
});
