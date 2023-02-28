const Koa = require("koa");
const app = new Koa();
const serve = require("koa-static");
const path = require("path");

const home = serve(path.normalize(__dirname + "/../"));

app.use(home);

const _server = app.listen(3393);

console.log("dirname => ", __dirname);

const consoleIP = () => {
  Object.values(require("os").networkInterfaces()).forEach((arr) => {
    arr.forEach((e) => {
      if (e.family === "IPv4") {
        console.log(e);
      }
    });
  });
};

consoleIP();

setTimeout(() => {
  _server.close();
}, 20000);
