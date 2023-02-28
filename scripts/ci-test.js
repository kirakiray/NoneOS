const server = require("./server");
const { exec } = require("child_process");

console.log("dirname => ", __dirname);

// 运行命令行命令
exec(
  `
pwd
npm run test
`,
  (error, stdout, stderr) => {
    if (error) {
      setTimeout(() => {
        server.close();
      }, 0);
      throw error;
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
    server.close();
  }
);
