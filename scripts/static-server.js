import Koa from "koa";
import serve from "koa-static";
import path from "path";
import HandShakeServer from "noneos-handshake";

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

const _server = app.listen(5559);

// 进程退出时关闭服务器
process.on("SIGINT", () => {
  console.log("收到 SIGINT，关闭服务器...");
  _server.close(() => {
    console.log("服务器已关闭");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("收到 SIGTERM，关闭服务器...");
  _server.close(() => {
    console.log("服务器已关闭");
    process.exit(0);
  });
});
console.log(`server start => http://localhost:5559/`);

export default {
  server: _server,
  home: path.normalize(__dirname + "/../"),
};

const server = new HandShakeServer({
  name: "local-test-server",
  port: 5569,
  allows: ["http://localhost:5569"],
});
