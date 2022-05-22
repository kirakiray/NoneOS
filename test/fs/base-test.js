import fs from "/system/fs/fs.mjs";

(async () => {
  const tester = expect(8, "base test");

  // 等待完成初始化
  await fs.inited;

  // 创建 base test 目录
  await fs.mkdir("/base_test").catch((err) => {});

  // 同时写入三个文件
  const aaaContent = `aaa.js ${Math.random()}`;
  fs.writeFile("/base_test/aaa.js", aaaContent);

  const bbbContent = `bbb.js ${Math.random()}`;
  fs.writeFile("/base_test/bbb.js", bbbContent);

  const cccContent = `ccc.js ${Math.random()}`;
  fs.writeFile("/base_test/ccc.js", cccContent);

  let baseTestData = await fs.read("/base_test");
  tester.ok(baseTestData.type === "folder", "read folder ok");
  tester.ok(
    baseTestData.content.length === 3,
    "write to file at the same time ok"
  );

  let aaaData = await fs.read("/base_test/aaa.js");
  tester.ok(aaaData.type === "file", "write and read aaa.js type ok");
  tester.ok(aaaData.content === aaaContent, "write and read aaa.js ok");

  let bbbData = await fs.read("/base_test/bbb.js");
  tester.ok(bbbData.type === "file", "write and read bbb.js type ok");
  tester.ok(bbbData.content === bbbContent, "write and read bbb.js ok");

  let cccData = await fs.read("/base_test/ccc.js");
  tester.ok(cccData.type === "file", "write and read ccc.js type ok");
  tester.ok(cccData.content === cccContent, "write and read ccc.js ok");
})();
