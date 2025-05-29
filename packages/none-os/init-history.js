export const initHistory = async ({ getCurrentFrame, onpopstate }) => {
  const bindHistory = () => {
    let f;
    window.addEventListener(
      "popstate",
      (f = (event) => {
        const { state } = event;

        const currentAppFrame = getCurrentFrame();

        if (state.routerType === "backward") {
          // console.log("app backward");
          history.forward(); // 还原
          currentAppFrame.back();
        } else if (state.routerType === "forward") {
          // console.log("app forward");
          history.back(); // 还原
          currentAppFrame.forward();
        } else {
          onpopstate && onpopstate(state);
        }
      })
    );

    return () => {
      window.removeEventListener("popstate", f);
    };
  };

  if (history.state && history.state.routerType === "current") {
    // 处于当前态就直接注册事件
    return bindHistory();
  }

  // 先修正为返回状态
  history.replaceState(
    {
      routerType: "backward",
    },
    "None OS back state",
    "/#backward"
  );

  await new Promise((res) => setTimeout(res, 50));

  // 添加当前页状态
  history.pushState(
    {
      routerType: "current",
    },
    "None OS",
    "/"
  );

  await new Promise((res) => setTimeout(res, 50));

  // 添加前进态
  history.pushState(
    {
      routerType: "forward",
    },
    "None OS forward state",
    "/#forward"
  );

  await new Promise((res) => setTimeout(res, 50));

  // 返回到正常的当前态
  history.back();

  return bindHistory();
};
