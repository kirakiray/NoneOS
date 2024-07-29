export const home = "./pages/general.html";

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

export function ready() {
  this.on("backward", () => {
    this.back();
  });
  this.on("forward", () => {
    // this.back();
    // this.$("[tool-layout]").appForward();
  });
}
