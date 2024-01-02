const Koa = require("koa");
const app = new Koa();
const serve = require("koa-static");
const path = require("path");

const home = serve(path.normalize(__dirname + "/../"));

app.use(home);

const _server = app.listen(3393);
console.log(`server start => http://localhost:3393/`);

module.exports = {
  server: _server,
  home: path.normalize(__dirname + "/../"),
};
