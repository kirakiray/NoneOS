const { test } = require("@playwright/test");

test.beforeEach(async ({ page, isMobile }) => {
  await page.goto(
    "http://localhost:3393/packages/fs/test/playwright-test.html"
  );
});

test.describe("Base Function", () => {
  test("writeFile and readFile", async ({ page }) => {
    return await page.waitForFunction(async (e) => {
      const ramid = Math.random();

      const fileContent = `"alert('It is test.js - ${ramid})"`;

      await fs.writeFile("/test.js", fileContent);

      const text = await fs.readFile("/test.js");

      const textOK = fileContent === text;
      const datas = await getAllData();

      return textOK && datas.length === 2;
    }, true);
  });

  test("renameFile", async ({ page }) => {
    return await page.waitForFunction(async (e) => {
      const ramid = Math.random();

      const fileContent = `"alert('It is test.js - ${ramid})"`;

      await fs.writeFile("/test.js", fileContent);

      const text = await fs.readFile("/test.js");

      const textOK = fileContent === text;
      const datas1 = await getAllData();

      await fs.renameFile("/test.js", "/test2.js");
      const text2 = await fs.readFile("/test2.js");

      const textOK2 = fileContent === text2;
      const datas2 = await getAllData();

      return textOK && textOK2 && datas1.length === 2 && datas2.length === 2;
    }, true);
  });

  test("mkdir and readDir", async ({ page }) => {
    return await page.waitForFunction(async (e) => {
      await fs.mkdir("/a");
      await fs.writeFile("/a/a1.js", "alert('It is a1.js')");
      await fs.writeFile("/a/a2.js", "alert('It is a2.js')");
      await fs.mkdir("/a/dir_test");

      const a_dir_datas = await fs.readDir("/a");

      const bool1 =
        JSON.stringify(a_dir_datas) ===
        JSON.stringify(["dir_test", "a1.js", "a2.js"]);

      const datas = await getAllData();

      return bool1 && datas.length === 3;
    }, true);
  });

  test("removeDir", async ({ page }) => {
    return await page.waitForFunction(async (e) => {
      await fs.mkdir("/a");
      await fs.writeFile("/a/a1.js", "alert('It is a1.js')");
      await fs.writeFile("/a/a2.js", "alert('It is a2.js')");
      await fs.mkdir("/a/dir_test");
      await fs.writeFile("/a/dir_test/b.js", "alert('bbb)");
      const firstCountOK = (await getAllData()).length === 6;

      await fs.removeDir("/a", { recursive: true });
      const lastCountOK = (await getAllData()).length === 1;

      return firstCountOK && lastCountOK;
    }, true);
  });
});
