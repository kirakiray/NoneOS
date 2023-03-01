const { expect, test } = require("@playwright/test");

test("Waiter test", async ({ page }) => {
  await page.goto("http://127.0.0.1:3393/");

  await new Promise((res) => setTimeout(res, 3000));

  await page.goto("http://127.0.0.1:3393/test/proxy-test.html");

  const contentA = `alert('I am a.js - ${Math.random()}')`;
  const contentB = `alert('I am b.js - ${Math.random()}')`;

  await page.waitForFunction(
    async (e) => {
      const { contentA, contentB } = e;

      await fs.writeFile("/a.js", contentA);
      await fs.mkdir("/test_dir");
      await fs.writeFile("/test_dir/b.js", contentB);
    },
    { contentA, contentB }
  );

  await new Promise((res) => setTimeout(res, 3000));

  await page.waitForFunction(
    async (e) => {
      const { contentA, contentB } = e;

      const content1 = await fetch("http://localhost:3393/@/a.js").then((e) =>
        e.text()
      );
      const content2 = await fetch(
        "http://127.0.0.1:3393/@/test_dir/b.js"
      ).then((e) => e.text());

      if (content1 !== contentA) {
        throw "fetch content1 error";
      }

      if (content2 !== contentB) {
        throw "fetch content2 error";
      }
    },
    { contentA, contentB }
  );
});
