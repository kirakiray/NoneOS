const { test } = require("@playwright/test");

test("Base write and read file", async ({ page }) => {
  await page.goto(
    "http://localhost:3393/packages/fs/test/playwright-test.html"
  );

  return await page.waitForFunction(async (e) => {
    const ramid = Math.random();

    const fileContent = `"alert('It is test.js - ${ramid})"`;

    await fs.writeFile("/test.js", fileContent);

    const text = await fs.readFile("/test.js");

    return fileContent === text;
  }, true);
});
