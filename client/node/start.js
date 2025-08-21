import http from "http";
import https from "https";
import url from "url";

const PORT = 30100;
const TARGET_HOST = "os.tutous.com";
const TARGET_PORT = 443;

// 创建代理服务器
const server = http.createServer((clientReq, clientRes) => {
  console.log(
    `[${new Date().toISOString()}] ${clientReq.method} ${clientReq.url}`
  );

  // 解析原始URL
  const parsedUrl = url.parse(clientReq.url);

  // 构建目标URL
  const targetPath = parsedUrl.path || "/";

  // 设置请求选项
  const options = {
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: targetPath,
    method: clientReq.method,
    headers: {
      ...clientReq.headers,
      host: TARGET_HOST,
      "User-Agent": clientReq.headers["user-agent"] || "Node.js Proxy",
    },
  };

  // 删除可能导致问题的头
  delete options.headers["accept-encoding"];
  delete options.headers["connection"];

  // 创建到百度的HTTPS请求
  const proxyReq = https.request(options, (proxyRes) => {
    // 设置响应头
    clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);

    // 将响应数据转发给客户端
    proxyRes.pipe(clientRes);
  });

  // 处理错误
  proxyReq.on("error", (err) => {
    console.error("代理请求错误:", err);
    clientRes.writeHead(500, { "Content-Type": "text/plain" });
    clientRes.end("代理服务器错误");
  });

  // 处理客户端请求超时
  proxyReq.setTimeout(30000, () => {
    console.error("代理请求超时");
    proxyReq.destroy();
    clientRes.writeHead(504, { "Content-Type": "text/plain" });
    clientRes.end("网关超时");
  });

  // 将客户端请求数据转发给目标服务器
  clientReq.pipe(proxyReq);
});

// 处理服务器错误
server.on("error", (err) => {
  console.error("服务器错误:", err);
});

// 启动服务器
server.listen(PORT, () => {
  console.log(`代理服务器已启动`);
  console.log(`监听端口: ${PORT}`);
  console.log(`目标域名: https://${TARGET_HOST}:${TARGET_PORT}`);
  console.log(`访问地址: http://localhost:${PORT}`);
  console.log("按 Ctrl+C 停止服务器");
});

// 优雅关闭
process.on("SIGTERM", () => {
  console.log("收到SIGTERM，正在关闭服务器...");
  server.close(() => {
    console.log("服务器已关闭");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("\n收到SIGINT，正在关闭服务器...");
  server.close(() => {
    console.log("服务器已关闭");
    process.exit(0);
  });
});
