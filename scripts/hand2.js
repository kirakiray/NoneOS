// 启动 WebSocket 服务器
// node --inspect server2/start.js --port=8081
// bun server2/start.js --port=8081

import { initServer } from "../server/src/index.js";

const port =
  parseInt(
    process.argv.find((arg) => arg.startsWith("--port="))?.split("=")[1]
  ) || 8081;

const serverName =
  process.argv.find((arg) => arg.startsWith("--name="))?.split("=")[1] ||
  "hand server";

const server = await initServer({
  port: port,
  serverName,
  password: "admin123",
  dbName: "hand1",
  //   // 记录用户数据连接的配置
  //   connectionSave: {
  //     dir: "./connection2", // 数据数据库名
  //     maxEntries: 1000, // 内存最大缓存记录数
  //     flushInterval: 10 * 60 * 1000, // 定时刷盘间隔（毫秒）
  //   },
});

// 优雅关闭服务器
process.on("SIGINT", () => {
  console.log("\n正在关闭服务器...");
  server.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n正在关闭服务器...");
  server.stop();
  process.exit(0);
});

console.log(`WebSocket服务器已启动，监听端口 ${port}`);
