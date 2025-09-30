import { createCorsProxyServer } from "crossway/src/server.js";

const PORT = 25100;
const PATH = "/proxy";

const server = createCorsProxyServer({ port: PORT, path: PATH });

server.listen(PORT, () => {
  console.log(`CORS Proxy server running on port ${PORT}`);
  console.log(`Access path: ${PATH}`);
});
