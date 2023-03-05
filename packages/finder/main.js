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

  finderFrame.on("click-add-folder", async (e) => {
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
  });

  finderFrame.on("back", () => {
    app.back();
  });

  let selecteds = [];

  finderFrame.on("selected-change", (e) => {
    selecteds = e.data;
    finderFrame.hasSelected = !!selecteds.length;
  });

  finderFrame.on("click-delete", async () => {
    const bool = confirm("Delete It?");

    if (bool && selecteds.length) {
      const target = selecteds[0];

      const needDeleteFilePath = `${
        finderFrame.path === "/" ? "/" : `${finderFrame.path}/`
      }${target.name}`;
      console.log("bool => ", bool, needDeleteFilePath);

      if (target.type === "dir") {
        await fs.removeDir(needDeleteFilePath);
      } else {
        debugger;
      }

      const lastPage = $.all("o-page").slice(-1)[0];
      lastPage.reload();

      finderFrame.hasSelected = false;
    }
  });

  finderFrame.on("click-rename", (e) => {
    if (selecteds.length) {
      const targetData = selecteds[0];
      const lastPage = $.all("o-page").slice(-1)[0];

      const targetBlock = lastPage.shadow.$(
        `entrance-block[type='${targetData.type}'][name='${targetData.name}']`
      );

      targetBlock.renameMode = 1;
      targetBlock.focusInput();
    }
  });

  app.on("rename-block", (e) => {
    const { data } = e;

    console.log("data => ", data);
  });
})();
