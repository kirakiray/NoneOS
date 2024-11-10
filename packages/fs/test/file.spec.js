import { test, expect } from "@playwright/test";

test("file system", async ({ page }) => {
  await page.goto("http://127.0.0.1:5559/packages/fs/test/test-fs.html");

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
  await page.getByText("root name ok").click();
  await page.getByText("catch useless handle ok").click();
  await page.getByText("repeat file ok").click();
  await page.getByText("remove root ok").click();
  await page.getByText("move to child ok").click();
  await page.getByText("moveTo file ok").click();
  await page.getByText("rename dir ok").click();

  expect(true).toBe(true);
});

test("opfs", async ({ page, browserName }) => {
  await page.goto("http://127.0.0.1:5559/packages/fs/test/test-opfs.html");

  // safari 下，fileSystemHandle无法写入内容
  if (browserName === "webkit") {
    test.skip(true, "safari fileSystemHandle No write permission");
    return;
  }

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
  await page.getByText("root name ok").click();
  await page.getByText("catch useless handle ok").click();
  await page.getByText("repeat file ok").click();
  await page.getByText("remove root ok").click();
  await page.getByText("move to child ok").click();
  await page.getByText("moveTo file ok").click();
  await page.getByText("rename dir ok").click();

  expect(true).toBe(true);
});

test("copy process", async ({ page, browserName }) => {
  await page.goto(
    "http://127.0.0.1:5559/packages/fs/test/test-copy-process.html"
  );

  // safari 下，fileSystemHandle无法写入内容
  if (browserName === "webkit") {
    test.skip(true, "safari fileSystemHandle No write permission");
    return;
  }

  await page.getByText("originCount: 4").click();
  await page.getByText("dbCount: 20").click();
  expect(true).toBe(true);
});

test("write stream", async ({ page, browserName }) => {
  await page.goto(
    "http://127.0.0.1:5559/packages/fs/test/test-write-stream.html"
  );

  await page.getByText("file stream: true").click();
  expect(true).toBe(true);
});

test("file hash", async ({ page, browserName }) => {
  await page.goto("http://127.0.0.1:5559/packages/fs/test/get-hash.html");
  
  if (browserName === "webkit") {
    test.skip(true, "safari fileSystemHandle No write permission");
    return;
  }

  await page.getByText("hash result :true").click();

  expect(true).toBe(true);
});

// test("write copy task", async ({ page, browserName }) => {
//   await page.goto("http://127.0.0.1:5559/packages/fs/test/test-task.html");

//   // safari 下，fileSystemHandle无法写入内容
//   if (browserName === "webkit") {
//     test.skip(true, "safari fileSystemHandle No write permission");
//     return;
//   }

//   await page.getByText("bigfile1: true").click();
//   await page.getByText("bigfile2: true").click();
//   await page.getByText("dbCount: 50").click();
// });
