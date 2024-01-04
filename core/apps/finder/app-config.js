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
  },
  next: {
    opacity: 0,
    transform: "translate(30px, 0)",
  },
  previous: {
    opacity: 0,
    transform: "translate(-30px, 0)",
  },
};
