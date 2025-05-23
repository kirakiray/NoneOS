import { initServer } from "./dist.js";
// import { initServer } from "./main.js";

const wss = initServer({
  port: 5579,
  name: "local-test-handserver",
  admin: ["1d14d3b31a76eeab220b48f562521f9b023e362119149072dcc02add230351b0"],
});
