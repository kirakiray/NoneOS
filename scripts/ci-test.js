const server = require("./server");
const { exec } = require("child_process");

// 运行命令行命令
exec("npm run test", (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
  console.error(`stderr: ${stderr}`);
  server.close();
});
