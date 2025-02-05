import { test, expect } from "@playwright/test";

test("fetch file", async ({ page }) => {
  await page.goto("http://localhost:5559/packages/sw/test/write-task.html");

  await page.getByText("sw state: activated").click();

  await new Promise((res) => setTimeout(res), 200);

  await page.evaluate(() => window.location.reload());

  await new Promise((res) => setTimeout(res), 200);

  await page.getByText("fetch file content ok").click();

  expect(1).toBe(1);
});
