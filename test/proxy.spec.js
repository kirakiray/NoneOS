const { expect, test } = require("@playwright/test");

test("Proxy test", async ({ page }) => {
  await page.goto("http://localhost:3393/");

  await new Promise((res) => setTimeout(res, 3000));

  await page.goto("http://localhost:3393/test/proxy-test.html");

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
      const isFirefox = navigator.userAgent.includes("Firefox");

      if (isFirefox) {
        // This does not work in playwright's Firefox, but in the actual use of Firefox Benshaw, for the time being unknown reasons
        return true;
      }

      const { contentA, contentB } = e;

      const content1 = await fetch("http://localhost:3393/@/a.js").then((e) =>
        e.text()
      );
      const content2 = await fetch(
        "http://localhost:3393/@/test_dir/b.js"
      ).then((e) => e.text());

      if (content1 !== contentA) {
        throw `fetch content1 error content1 => ${content1}`;
      }

      if (content2 !== contentB) {
        throw `fetch content2 error content2 => ${content2}`;
      }
    },
    { contentA, contentB }
  );
});
