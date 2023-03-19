const Koa = require("koa");
const path = require("path");
const Router = require("koa-router");

const app = new Koa();

let home = new Router();

home.get("/", async (ctx) => {
  ctx.body = ctx;

  ctx.append("ha", "hahaha");

  console.log("query =>", ctx.request, ctx.request.query);
});

app.use(home.routes());

app.listen(3900);

console.log("server start");
