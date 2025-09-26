import { createCorsProxyServer } from "crossway/src/server.js";

createCorsProxyServer({ port: 25100, path: "/proxy" });

console.log("CORS server http://localhost:25100/proxy");
