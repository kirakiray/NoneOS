import { initServer } from "./index.js";

const server = await initServer({
  password: "admin123",
  port: 18290,
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

console.log("WebSocket服务器已启动，按 Ctrl+C 关闭服务器");
