import Koa from "koa";
import serve from "koa-static";
import path from "path";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const home = serve(path.normalize(__dirname + "/../"));

const app = new Koa();
app.use(async (ctx, next) => {
  ctx.set("Access-Control-Allow-Origin", "*");
  ctx.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Content-Length, Authorization, Accept, X-Requested-With"
  );
  ctx.set("Access-Control-Allow-Methods", "PUT, POST, GET, DELETE, OPTIONS");
  if (ctx.method == "OPTIONS") {
    ctx.body = 200;
  } else {
    await next();
  }
});
app.use(home);

const _server = app.listen(5548);
console.log(`server start => http://localhost:5548/`);

export default {
  server: _server,
  home: path.normalize(__dirname + "/../"),
};
