export const home = "./apps.html";

export function ready() {
  this.on("active-app", () => {
    this.current.refreshApps();
  });
}
