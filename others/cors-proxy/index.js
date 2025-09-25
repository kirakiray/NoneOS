import http from "http";
import https from "https";
import url from "url";
import { parseArgs } from "util";

// 解析命令行参数
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    port: {
      type: "string",
      short: "p",
      default: process.env.PORT || "3000",
    },
    path: {
      type: "string",
      short: "P",
      default: "/",
    },
  },
});

const PORT = parseInt(values.port) || 3000;
const PATH = values.path || "/";

const server = http.createServer((req, res) => {
  // 检查请求路径是否匹配配置的路径
  if (!req.url.startsWith(PATH)) {
    res.writeHead(404);
    res.end("");
    return;
  }

  // 设置CORS头部
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // 处理预检请求
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // 解析目标URL
  const parsedUrl = url.parse(req.url, true);
  const targetUrl = parsedUrl.query.url;

  if (!targetUrl) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Missing url parameter" }));
    return;
  }

  // 解析目标URL协议
  const targetParsed = url.parse(targetUrl);
  const isHttps = targetParsed.protocol === "https:";

  // 构建请求选项
  const requestOptions = {
    hostname: targetParsed.hostname,
    port: targetParsed.port || (isHttps ? 443 : 80),
    path: targetParsed.path,
    method: req.method,
    headers: { ...req.headers },
  };

  // 删除与代理相关的头部
  delete requestOptions.headers["host"];
  delete requestOptions.headers["origin"];

  // 发起请求到目标服务器
  const proxyReq = (isHttps ? https : http).request(
    requestOptions,
    (proxyRes) => {
      // 设置响应头部
      res.writeHead(proxyRes.statusCode, {
        "Access-Control-Allow-Origin": "*",
        ...proxyRes.headers,
      });

      // 转发响应数据
      proxyRes.pipe(res);
    }
  );

  // 处理请求错误
  proxyReq.on("error", (err) => {
    console.error("Proxy request error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ error: "Proxy request failed", message: err.message })
    );
  });

  // 转发请求数据
  req.pipe(proxyReq);
});

server.listen(PORT, () => {
  console.log(`CORS Proxy server running on port ${PORT}`);
  console.log(`Access path: ${PATH}`);
});
