import { initServer as initSer1 } from "../server/src/index.js";
import { initServer as initSer2 } from "../server/dist.js";
import staticSer from "./static-server.js";
import shell from "shelljs";

// staticSer.server.close();

const wss1 = initSer1({
  port: 18290,
  serverName: "local-test-handserver",
});

const wss2 = initSer2({
  port: 18291,
  serverName: "local-test-handserver2",
});

shell.exec(`npx playwright test`, function (code, stdout, stderr) {
  console.log("Exit code:", code);
  console.log("Program output:", stdout);
  console.log("Program stderr:", stderr);
  // 关闭整个进程
  process.exit();
  // staticSer.server.close();
  //   wss1.close();
  //   wss2.close();
  if (code !== 0) {
    throw "run error";
  }
});
