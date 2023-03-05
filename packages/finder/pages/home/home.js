Page(async ({ load }) => {
  await load("../../comps/entrance-block -p");
  const { default: fs } = await load("/packages/fs/index.mjs");

  return {
    data: {
      // path: null,
      details: [],
      isReady: false,
    },
    proto: {
      enterFolder(data) {
        this.trigger("goto-folder", {
          path: (this.path === "/" ? "/" : `${this.path}/`) + data.name,
        });
      },
      async reload() {
        const { path } = this.query;
        const data = await fs.readDir(path);
        this.details = data;
      },
      select($data) {
        const oldSelectedItem = this.details.find((e) => {
          return e.selected;
        });

        if (oldSelectedItem && oldSelectedItem !== $data) {
          oldSelectedItem.selected = null;
        }

        if (!$data.selected) {
          ``;
          $data.selected = 1;
        } else {
          $data.selected = null;
        }

        const selecteds = this.details
          .filter((e) => e.selected)
          .map((e) => e.toJSON());

        this.trigger("selected-change", selecteds);
      },
      get path() {
        const { path } = this.query;
        return path;
      },
    },
    async ready() {
      await this.reload();
      this.isReady = true;

      this.shadow.on("rename-block", async (e) => {
        const { data } = e;
        const { path } = this;

        const oldPath = `${path === "/" ? "" : path}/${data.oldName}`;
        const newPath = `${path === "/" ? "" : path}/${data.name}`;

        if (data.type === "dir") {
          await fs.renameDir(oldPath, newPath);
          this.reload();
        }
      });
    },
  };
});
