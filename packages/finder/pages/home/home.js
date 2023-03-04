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
          path: this.path + data.name,
        });
      },
      async reload() {
        this.isReady = false;
        const { path } = this.query;
        const data = await fs.readDir(path);
        this.details = data;
        this.isReady = true;
      },
      get path() {
        const { path } = this.query;
        return path;
      },
    },
    ready() {
      this.reload();
    },
  };
});
