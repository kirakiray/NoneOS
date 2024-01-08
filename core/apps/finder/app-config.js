export const home = "./files.html";

export const loading = () => {
  const loadingEl = $({
    tag: "div",
    css: {
      width: "100%",
      height: "100%",
      position: "absolute",
      zIndex: 1000,
    },
    html: `
      <div style="transition: all 10s cubic-bezier(0, 0, 0.22, 0.84) 0s; height: 2px;width: 0;background-color: rgb(0, 161, 46);"></div>
    `,
  });
};

export const pageAnime = {
  current: {
    opacity: 1,
    transform: "translate(0, 0)",
    "transition-duration": ".05s",
  },
  next: {
    opacity: 0,
    transform: "translate(10px, 0)",
    "transition-duration": ".05s",
  },
  previous: {
    opacity: 0,
    transform: "translate(-10px, 0)",
    "transition-duration": ".05s",
  },
};
