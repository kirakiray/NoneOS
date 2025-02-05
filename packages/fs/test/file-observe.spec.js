import { test, expect } from "@playwright/test";

test("monitoring Files", async ({ page }) => {
  await page.goto("http://localhost:5559/packages/fs/test/test-obs.html");

  await new Promise((res) => setTimeout(res, 1000));

  const log1SucceedText = `[{"type":"create-dir","path":"local/dir1/dir2"},{"type":"create-file","path":"local/dir1/dir2/file1.txt"},{"type":"write","path":"local/dir1/dir2/file1.txt"},{"type":"paste","path":"local/dir1/dir2/file2.txt","from":"local/dir3/file2.txt"}]`;

  expect(await page.evaluate(() => $("#log1").text)).toBe(log1SucceedText);

  expect(await page.evaluate(() => $("#log2").text)).toBe(
    `[{"type":"create-file","path":"local/dir3/file2.txt"},{"type":"write","path":"local/dir3/file2.txt"},{"type":"moveto","path":"local/dir3/file2.txt","to":"local/dir1/dir2"}]`
  );

  expect(
    await page.evaluate(() => $("iframe").ele.contentWindow.$("#log1").text)
  ).toBe(log1SucceedText);
});
