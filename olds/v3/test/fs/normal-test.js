import fs from "/system/fs/fs.mjs";

(async () => {
  await fs.inited;
  await fs.mkdir("/normal_test").catch((err) => {});

  const randomColor = Math.floor(Math.random() * 255 * 255 * 255)
    .toString(16)
    .padStart(6, 0);

  fs.writeFile(
    "/normal_test/test.html",
    `<body> <div style="color:#${randomColor};">我是 test html</div> </body>`,
    {
      headers: {
        "content-type": "text/html; charset=UTF-8",
      },
    }
  );
})();
