import { initServer as initSer1 } from "../server/main.js";
import { initServer as initSer2 } from "../server/dist.js";
import staticSer from "./static-server.js";
import shell from "shelljs";

// staticSer.server.close();

const wss1 = initSer1({
  port: 5579,
  name: "local-test-handserver",
  admin: ["1d14d3b31a76eeab220b48f562521f9b023e362119149072dcc02add230351b0"],
});

const wss2 = initSer2({
  port: 5589,
  name: "local-test-handserver2",
  admin: ["1d14d3b31a76eeab220b48f562521f9b023e362119149072dcc02add230351b0"],
});

shell.exec(`npx playwright test`, function (code, stdout, stderr) {
  console.log("Exit code:", code);
  console.log("Program output:", stdout);
  console.log("Program stderr:", stderr);
  staticSer.server.close();
  // 关闭整个进程
  process.exit();
  //   wss1.close();
  //   wss2.close();
  if (code !== 0) {
    throw "run error";
  }
});
