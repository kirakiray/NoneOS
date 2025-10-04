// 启动 WebSocket 服务器
// node --inspect server2/start.js --port=8081
// bun server2/start.js --port=8081

import { initServer } from "./src/index.js";

const port =
  parseInt(
    process.argv.find((arg) => arg.startsWith("--port="))?.split("=")[1]
  ) || 8081;

const server = await initServer({
  password: "admin123",
  port: port,
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
