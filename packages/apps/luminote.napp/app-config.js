export const home = "./pages/home.html";

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

export const allowForward = true;

// import { setSpace } from "/packages/i18n/data.js";

// await setSpace(
//   "bookmarks",
//   new URL("/packages/apps/bookmarks.napp/lang", location.href).href
// );
