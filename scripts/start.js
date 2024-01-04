import Koa from "koa";
import serve from "koa-static";

import open, { apps } from "open";
import "./static-server.js";

await open("http://127.0.0.1:5559", { app: { name: apps.chrome } });

{
  const home = serve("/Users/huangyao/Documents/GitHub/Punch-UI");

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

  app.listen(5547);
}
