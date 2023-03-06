Component(async ({ load }) => {
  await load("./font/iconfont.css");

  return {
    // tempsrc: "./static-frame.html",
    data: {
      path: "",
      backDisabled: false,
      hasSelected: false,
    },
  };
});
