import fs from "/system/fs/fs.mjs";

(async () => {
  await fs.inited;
  await fs.mkdir("/normal_test").catch((err) => {});

  fs.writeFile(
    "/normal_test/test.html",
    `
  <body>
  <div style="color:red;">我是 test html</div>
  </body>
  `
  );
})();
