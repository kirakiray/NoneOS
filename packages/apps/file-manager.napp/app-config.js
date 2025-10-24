export const home = "./pages/explore.html?path=local";

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

export const onHandle = async (e) => {
  console.log("onHandle: ", e);
};

export const allowForward = true;

const load = lm(import.meta);
load("/packages/i18n/localized-content.html");
