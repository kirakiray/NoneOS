(async () => {
  await load("./comps/finder-frame -p");
  const { default: fs } = await load("/packages/fs/index.mjs");

  const finderFrame = $("finder-frame");
  const app = $("o-app");
  console.log("app => ", app);

  app.watch(async () => {
    const lastPage = $.all("o-page").slice(-1)[0];

    await lastPage.watchUntil("status === 'loaded'");

    const { path } = lastPage;
    finderFrame.path = path;

    if (path === "/") {
      finderFrame.backDisabled = true;
    } else {
      finderFrame.backDisabled = false;
    }
  });

  finderFrame.path = "/";

  finderFrame.on("add-folder", async (e) => {
    const lastPage = $.all("o-page").slice(-1)[0];

    const { path } = lastPage;

    let hasFolder;
    let num = 0;
    let newFolderPath;

    do {
      newFolderPath = `${path === "/" ? "" : path}/新建文件夹${num || ""}`;

      hasFolder = await fs.readDir(newFolderPath);
      num++;
    } while (hasFolder);

    await fs.mkdir(newFolderPath);

    lastPage.reload();
  });

  finderFrame.on("goto-folder", (e) => {
    const { data } = e;

    app.router.push(`pages/home/home.js?path=${data.path}`);

    console.log("goto => ", data);
  });

  finderFrame.on("back", () => {
    app.back();
  });
})();
