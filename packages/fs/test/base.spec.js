const { expect, test } = require("@playwright/test");

// test.use({ viewport: { width: 200, height: 200 } });

test.beforeEach(async ({ page, isMobile }) => {
  await page.goto(
    "http://127.0.0.1:3393/packages/fs/test/playwright-test.html"
  );
});

test.describe("Base Function", () => {
  test("writeFile and readFile", async ({ page }) => {
    return await page.waitForFunction(async () => {
      const ramid = Math.random();

      const fileContent = `"alert('It is test.js - ${ramid})"`;

      await fs.writeFile("/test.js", fileContent);

      const text = await fs.readFile("/test.js");

      if (fileContent !== text) {
        throw "text error";
      }
      const datas = await getAllData();

      if (datas.length !== 2) {
        throw "indexdb count error";
      }
    });
  });

  test("renameFile", async ({ page }) => {
    return await page.waitForFunction(async () => {
      const ramid = Math.random();

      const fileContent = `"alert('It is test.js - ${ramid})"`;

      await fs.writeFile("/test.js", fileContent);

      const text = await fs.readFile("/test.js");

      if (fileContent !== text) {
        throw "file content error";
      }
      const datas1 = await getAllData();

      await fs.renameFile("/test.js", "/test2.js");
      const text2 = await fs.readFile("/test2.js");

      if (fileContent !== text2) {
        throw "after file content error";
      }
      const datas2 = await getAllData();

      if (!(datas1.length === 2 && datas2.length === 2)) {
        throw "indexdb count error";
      }
    });
  });

  test("renameFile in cut mode", async ({ page }) => {
    return await page.waitForFunction(async () => {
      await fs.writeFile("/rn_file01", "I am rnfile01");
      await fs.mkdir("/a");
      await fs.renameFile("/rn_file01", "/a/f2");

      const text = await fs.readFile("/a/f2");

      if (text !== "I am rnfile01") {
        throw "read text error";
      }
      const datas = await getAllData();

      if (datas.length !== 3) {
        throw "index db count error";
      }
    });
  });

  test("mkdir and readDir", async ({ page }) => {
    return await page.waitForFunction(async () => {
      await fs.mkdir("/a");
      await fs.writeFile("/a/a1.js", "alert('It is a1.js')");
      await fs.writeFile("/a/a2.js", "alert('It is a2.js')");
      await fs.mkdir("/a/dir_test");

      const a_dir_datas = await fs.readDir("/a");

      if (
        JSON.stringify(a_dir_datas.map((e) => e.name)) !==
        JSON.stringify(["dir_test", "a1.js", "a2.js"])
      ) {
        throw `read dir data error`;
      }

      const datas = await getAllData();

      if (datas.length !== 5) {
        throw "indexdb count error";
      }
    });
  });

  test("removeDir", async ({ page }) => {
    return await page.waitForFunction(async () => {
      await fs.mkdir("/a");
      await fs.writeFile("/a/a1.js", "alert('It is a1.js')");
      await fs.writeFile("/a/a2.js", "alert('It is a2.js')");
      await fs.mkdir("/a/dir_test");
      await fs.writeFile("/a/dir_test/b.js", "alert('bbb)");
      const firstCountOK = (await getAllData()).length === 6;

      await fs.removeDir("/a", { recursive: true });
      const lastCountOK = (await getAllData()).length === 1;

      if (!(firstCountOK && lastCountOK)) {
        throw "remove dir error";
      }
    });
  });

  test("renameDir", async ({ page }) => {
    return await page.waitForFunction(async () => {
      await fs.mkdir("/a");
      await fs.writeFile("/a/a1.js", "alert('It is a1.js')");
      await fs.writeFile("/a/a2.js", "alert('It is a2.js')");
      await fs.mkdir("/a/dir_test");
      await fs.writeFile("/a/dir_test/b.js", "alert('bbb)");
      await fs.mkdir("/b");

      const firstCountOK = (await getAllData()).length === 7;

      await fs.renameDir("/a", "/b/sub_dir");

      const oldDirOK = !(await fs.readDir("/a"));

      const content1 = await fs.readFile("/b/sub_dir/a1.js");
      const content2 = await fs.readFile("/b/sub_dir/a2.js");

      const content1OK = content1 === "alert('It is a1.js')";
      const content2OK = content2 === "alert('It is a2.js')";

      const lastCountOK = (await getAllData()).length === 7;

      return (
        firstCountOK && lastCountOK && content1OK && content2OK && oldDirOK
      );
    });
  });
});

test("Waiter test", async ({ page }) => {
  await page.goto("http://127.0.0.1:3393/packages/fs/test/waiter-test.html");

  await expect(page.getByTestId("log")).toHaveText("Initial task completed");

  await page.getByTestId("resolve-n1").click();

  await expect(page.getByTestId("log")).toHaveText("The second task");

  await page.getByTestId("resolve-n2").click();

  await expect(page.getByTestId("log")).toHaveText("The third task");
});
