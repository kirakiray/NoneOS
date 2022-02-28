(async () => {
  const tester = expect(5, "write and read ok");

  await fs.inited;
  await fs.mkdir("/fs_test_write_and_read").catch((err) => console.log(err));
  await fs
    .mkdir("/fs_test_write_and_read/testdir")
    .catch((err) => console.log(err));
  await fs
    .mkdir("/fs_test_write_and_read/testdir2")
    .catch((err) => console.log(err));
  const rdStr = Math.random();
  await fs.writeFile("/fs_test_write_and_read/aaa.js", `alert('${rdStr}')`);

  const data = await fs.read("/fs_test_write_and_read");

  tester.ok(data.content.length === 3, "write and read length ok");
  tester.ok(
    !!data.content.find((e) => e.name === "testdir"),
    "testdir folder exist"
  );
  tester.ok(
    !!data.content.find((e) => e.name === "testdir2"),
    "testdir2 folder exist"
  );
  tester.ok(!!data.content.find((e) => e.name === "aaa.js"), "aaa.js exist");

  const aaajs = await fs.read("/fs_test_write_and_read/aaa.js");

  tester.ok(aaajs.content === `alert('${rdStr}')`, "write file ok");
})();
