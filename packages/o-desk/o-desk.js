Component(async ({ load }) => {
  await load("./comps/app-frame -p");

  return {
    data: {
      time: "",
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
