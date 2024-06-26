import { test, expect } from "@playwright/test";

const testCases = async (page) => {
  await page.getByText("get local ok").click();
  await page.getByText("get subDir ok").click();
  await page.getByText("multi handle Id ok").click();
  await page.getByText("dir path ok").click();
  await page.getByText("file id ok").click();
  await page.getByText("read file content ok").click();
  await page.getByText("file lowercase ok").click();
  await page.getByText("long text ok").click();
  await page.getByText("read range ok").click();
  await page.getByText("read random range ok").click();
  await page.getByText("remove dir ok").click();
  await page.getByText("after copy text ok").click();
  await page.getByText("root ok").click();
  await page.getByText("catch useless handle ok").click();
};

test("file system", async ({ page }) => {
  await page.goto("http://127.0.0.1:5559/packages/fs/test/test-fs.html");

  await testCases(page);
});

test("opfs", async ({ page, browserName }) => {
  await page.goto("http://127.0.0.1:5559/packages/fs/test/test-opfs.html");

  // safari 下，fileSystemHandle无法写入内容
  if (browserName === "webkit") {
    return;
  }

  await testCases(page);
});
