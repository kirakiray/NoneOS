import { test, expect } from "@playwright/test";
import { testSucceedCount } from "../../specUtil.js";

test.describe("Remote File System Handle Tests", () => {
  test("Get and Set test", async ({ page }) => {
    await page.goto("tests/fs/remote/get-and-set.html");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    await testSucceedCount(page, 3);
  });
});
