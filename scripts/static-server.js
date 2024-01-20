import Koa from "koa";
import serve from "koa-static";
import path from "path";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const home = serve(path.normalize(__dirname + "/../"));

const app = new Koa();
app.use(home);

const _server = app.listen(5559);
console.log(`server start => http://localhost:5559/`);

export default {
  server: _server,
  home: path.normalize(__dirname + "/../"),
};
