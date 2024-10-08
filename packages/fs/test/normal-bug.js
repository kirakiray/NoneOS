import { finalGet } from "./init.js";
import { ok } from "./ok.js";

(async () => {
  const get = await finalGet;

  const localRoot = await get("local");

  await localRoot.get("test_file", {
    create: "file",
  });

  await localRoot
    .get("test_file", {
      create: "dir",
    })
    .then(() => {
      ok(false, "repeat file");
    })
    .catch((err) => {
      console.log(err);
      ok(true, "repeat file");
    });

  await localRoot
    .remove()
    .then(() => {
      ok(false, "remove root");
    })
    .catch((err) => {
      console.log(err);
      ok(true, "remove root");
    });

  const testCopyDir = await get("local/t1/t2/t3.txt", {
    create: "file",
  });

  await testCopyDir.write("aaa");

  const t1 = await get("local/t1");
  const t2 = await get("local/t1/t2");

  t1.copyTo(t2)
    .then(() => {
      ok(false, "move to child");
    })
    .catch((err) => {
      console.log(err);
      ok(true, "move to child");
    });
})();
