export const home = "./files.html";

export const loading = () => {
  return `<div style="display:flex;justify-content:center;align-items:center;">
    Loading
  </div>`;
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
