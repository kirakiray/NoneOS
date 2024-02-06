// const load = lm(import.meta);
// import "http://127.0.0.1:55470/init.js";
import "https://cdn.jsdelivr.net/gh/ofajs/Punch-UI@0.1.5/init.js";
import "./core/init.js";

navigator.serviceWorker
  .register("sw.js", {
    type: "module",
  })
  .then((reg) => {
    setTimeout(() => {
      reg.update();
    }, 60 * 60 * 1000);
  })
  .catch((err) => {
    console.error(err);
  });
