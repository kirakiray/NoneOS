import { parseArgs } from "util";
import { createCorsProxyServer } from "./src/server.js";

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

const server = createCorsProxyServer({ port: PORT, path: PATH });

server.listen(PORT, () => {
  console.log(`CORS Proxy server running on port ${PORT}`);
  console.log(`Access path: ${PATH}`);
});
