(async () => {
  const tester = expect(5, "base test");

  // 等待完成初始化
  await fs.inited;

  // 创建 base test 目录
  await fs.mkdir("/base_test").catch((err) => {});

  await fs.writeFile("/base_test/aaa.js", "aaa.js haha");
})();
