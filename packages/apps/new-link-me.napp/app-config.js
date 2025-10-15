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

export const onHandle = async function ({ handle, path }) {
  // handle 和 path 必定会传入其中一个
  console.log("onHandle: ", path, handle);
};

export const allowForward = true;

import { setSpace } from "/packages/i18n/data.js";

await setSpace(
  "linkme",
  new URL("/packages/apps/link-me.napp/lang", location.href).href
);

const load = lm(import.meta);
load("/packages/i18n/localized-content.html");
