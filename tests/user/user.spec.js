import { test, expect } from "@playwright/test";
import { testSucceedCount } from "../specUtil.js";

test.describe("User Tests", () => {
  test("Certificate generation and verification tests", async ({ page }) => {
    await page.goto("/tests/user/util.html");
    await testSucceedCount(page, 3);
  });

  test("User data signing and verification tests", async ({ page }) => {
    await page.goto("/tests/user/main.html");
    await testSucceedCount(page, 4);
  });

  test("Handshake server friend finding tests", async ({
    page,
    browserName,
  }) => {
    await page.goto("/tests/user/handserver.html");
    await testSucceedCount(page, 2);
  });

  test("Invite code tests", async ({ page, browserName }) => {
    await page.goto("/tests/user/invite-code.html");
    await testSucceedCount(page, 2);
  });

  test("Agent data transfer tests", async ({ page, browserName }) => {
    await page.goto("/tests/user/agent-data.html");
    await testSucceedCount(page, 6);
  });

  // test("Card handout tests", async ({ page, browserName }) => {
  //   await page.goto("/tests/user/card-handout.html");
  //   await testSucceedCount(page, 1);
  // });

  test("Device addition tests", async ({ page, browserName }) => {
    await page.goto("/tests/user/add-device.html");
    await testSucceedCount(page, 1);
  });
});
