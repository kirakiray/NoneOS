const { server, home } = require("./server");
const shell = require("shelljs");

console.log("home => ", home);

// 运行命令行命令
shell.exec(`npm run test`, function (code, stdout, stderr) {
  console.log("Exit code:", code);
  console.log("Program output:", stdout);
  console.log("Program stderr:", stderr);
  server.close();
  if (code !== 0) {
    throw "run error";
  }
});
