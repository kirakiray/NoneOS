const Koa = require("koa");
const app = new Koa();
const serve = require("koa-static");
const path = require("path");

const home = serve(path.normalize(__dirname + "/../"));

app.use(home);
const _server = app.listen(3393);

setTimeout(() => {
    _server.close();
}, 20000);
