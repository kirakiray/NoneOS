import { finalGet } from "./init.js";
import { ok } from "./ok.js";

(async () => {
  const get = await finalGet;

  const localRoot = await get("local");

  const isOrigin = localRoot._mark === "origin";

  const subHandle = await get("local/subDir", {
    create: "dir",
  });

  if (isOrigin) {
    ok(subHandle.name === "subdir", "get subDir");
  } else {
    ok(subHandle.name === "subDir", "get subDir");
  }

  const subHandle_2 = await localRoot.get("subDir");

  ok(subHandle.id === subHandle_2.id, "multi handle Id");

  const sub3 = await localRoot.get("subDir3/sub3-1/sbu3-1-1", {
    create: "dir",
  });

  if (isOrigin) {
    ok(sub3.path === "local/subDir3/sub3-1/sbu3-1-1".toLowerCase(), "dir path");
  } else {
    ok(sub3.path === "local/subDir3/sub3-1/sbu3-1-1", "dir path");
  }

  for await (let e of localRoot.entries()) {
    console.log("entries: ", e);
  }

  await get("local/subDir3/sub3-1/sub3-1-2", {
    create: "dir",
  });
  const file1 = await get("local/subDir3/sub3-1/sub3-1-2/test.txt", {
    create: "file",
  });

  await file1.write("test file1!");

  const file2 = await get(
    "local/subDir3/sub3-1/sub3-1-2/sub3-1-2-1/sub3-1-2-1-1/test.txt",
    {
      create: "file",
    }
  );

  await file2.write("test file2!!");

  await file2.moveTo("test2.txt");
  // .catch((err) => {
  //   console.error(err);
  // });

  const sub3_1 = await get("local/subDir3/sub3-1");

  await sub3_1.copyTo("sub3_2");
  // .catch((err) => {
  //   console.error(err);
  // });

  await sub3_1.remove();

  const reSub3_1 = await get("local/subDir3/sub3-1");

  ok(reSub3_1 === null, "remove dir");

  const test2Handle = await get(
    "local/subDir3/sub3_2/sub3-1-2/sub3-1-2-1/sub3-1-2-1-1/test2.txt"
  );

  const c2text = await test2Handle.text();

  ok(c2text === "test file2!!", "after copy text");

  const root = await test2Handle.root();

  ok(root.name === "local", "root name");

  const sub3_2 = await get("local/subDir3/sub3_2");

  await sub3_2.remove();

  await test2Handle
    .text()
    .then(() => {
      ok(false, "catch useless handle");
    })
    .catch((err) => {
      console.log(err);
      ok(true, "catch useless handle");
    });
})();
