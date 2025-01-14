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

export const onHandle = async function ({ handle, path }) {
  // handle 和 path 必定会传入其中一个
  console.log("onHandle: ", path, handle);
  this.current.goto(`./view.html?path=${path}`);
};
