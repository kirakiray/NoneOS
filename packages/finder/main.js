(async () => {
  await load("./comps/finder-frame -p");
  const { default: fs } = await load("/packages/fs/index.mjs");

  const finderFrame = $("finder-frame");
  const app = $("o-app");
  console.log("app => ", app);

  const getLastPage = () => $.all("o-page").slice(-1)[0];

  // fix path display
  app.watch(async () => {
    const lastPage = getLastPage();

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
    const lastPage = getLastPage();

    const { path } = lastPage;

    let hasFolder;
    let num = 0;
    let newFolderPath;

    do {
      newFolderPath = `${path === "/" ? "" : path}/newFolder${num || ""}`;

      hasFolder = await fs.readDir(newFolderPath);
      num++;
    } while (hasFolder);

    await fs.mkdir(newFolderPath);

    lastPage.reload();
  });

  finderFrame.on("goto-folder", (e) => {
    const { data } = e;

    if (data.type === "dir") {
      app.router.push(`pages/list/list.js?path=${data.path}`);
    } else {
      window.open(`${origin}/@${data.path}`);
    }
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
        await fs.removeFile(needDeleteFilePath);
      }

      const lastPage = getLastPage();
      lastPage.reload();

      finderFrame.hasSelected = false;
    }
  });

  finderFrame.on("click-rename", (e) => {
    if (selecteds.length) {
      const targetData = selecteds[0];
      const lastPage = getLastPage();

      const targetBlock = lastPage.shadow.$(
        `entrance-block[type='${targetData.type}'][name='${targetData.name}']`
      );

      targetBlock.toRename();
    }
  });

  const importData = async (path, obj) => {
    if (!path) {
      return;
    }

    return Promise.all(
      Object.entries(obj).map(async ([name, data]) => {
        const newPath = `${path === "/" ? "" : path}/${name}`;
        if (data instanceof File) {
          await fs.writeFile(newPath, data);
          return;
        }

        const targetFolder = await fs.readDir(newPath);

        if (!targetFolder) {
          await fs.mkdir(newPath);
        }

        await importData(newPath, data);
      })
    );
  };

  finderFrame.on("click-import", async () => {
    const e = $(`<input type="file" webkitdirectory />`);

    e.on("change", async (event) => {
      const dataMap = {};

      for (const file of event.target.files) {
        const { webkitRelativePath } = file;

        const pathArr = webkitRelativePath.split("/");
        let temp = dataMap;
        while (pathArr.length) {
          const firstKey = pathArr.shift();
          if (!pathArr.length) {
            temp[firstKey] = file;
          } else {
            temp = temp[firstKey] || (temp[firstKey] = {});
          }
        }
      }

      await importData(finderFrame.path, dataMap);

      getLastPage().reload();
    });

    e.ele.click();
  });
})();
