import fs from "/system/fs/fs.mjs";

(async () => {
  const tester = expect(3, "remove test");

  await fs.inited;
  await fs.mkdir("/remove_test").catch((err) => console.log(err));
  await fs.mkdir("/remove_test/dir1").catch((err) => console.log(err));
  await fs.mkdir("/remove_test/dir1/sub1").catch((err) => console.log(err));
  await fs.mkdir("/remove_test/dir1/sub2").catch((err) => console.log(err));
  await fs.mkdir("/remove_test/dir1/sub3").catch((err) => console.log(err));
  await fs.writeFile("/remove_test/dir1/aaa.js", `alert('I am aaa.js')`);

  const parDir = await fs.read("/remove_test");
  const dir1 = await fs.read("/remove_test/dir1");

  tester.ok(parDir.content.length === 1, "parent dir ok");
  tester.ok(dir1.content.length === 4, "target dir ok");

  await fs.remove("/remove_test/dir1");

  const parDir2 = await fs.read("/remove_test");

  tester.ok(parDir2.content.length === 0, "parent dir remove ok");
})();
