Component(async ({ load }) => {
  await load("./comps/app-frame -p", "../entrance-block -p");

  return {
    data: {
      time: "",
    },
    proto: {
      selectBlock(target) {
        const oldSelected = this.shadow
          .$("#desktop-layer")
          .find((e) => e.selected);
        this.shadow.$("#desktop-layer").forEach((e) => (e.selected = null));
        if (oldSelected === target) {
          target.selected = null;
        } else {
          target.selected = 1;
        }
      },
      openFolder() {
        this.shadow.$("#app-layer").push(`
        <app-frame src="/packages/finder/index.html"></app-frame>
        `);
      },
      openSyncAss() {
        this.shadow.$("#app-layer").push(`
        <app-frame src="/packages/sync-assistant/index.html"></app-frame>
        `);
      },
    },
    attached() {
      this.time = new Date().toLocaleString();
      this._timer = setInterval(() => {
        this.time = new Date().toLocaleString();
      }, 1000);
    },
    detached() {
      clearInterval(this._timer);
    },
  };
});
