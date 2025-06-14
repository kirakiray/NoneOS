import { initServer } from "./main.js";

const server = initServer({
  port: 5579,
  name: "local-test-handserver",
  admin: [],
});

globalThis.wsss = server;
