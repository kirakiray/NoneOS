import fs from "/system/fs/fs.js";

(async () => {
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
