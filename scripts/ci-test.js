const server = require("./server");
const shell = require("shelljs");

console.log("dirname => ", __dirname);

// 运行命令行命令
shell.exec(`npm run test`, function (code, stdout, stderr) {
  console.log("Exit code:", code);
  console.log("Program output:", stdout);
  console.log("Program stderr:", stderr);
  if (code === 0) {
    console.log("成功");
  }
  server.close();
});

// 运行命令行命令
// exec(
//   `cd ${__dirname}
// pwd
// npm run test
// `,
//   (error, stdout, stderr) => {
//     if (error) {
//       setTimeout(() => {
//         server.close();
//       }, 0);
//       throw error;
//     }
//     console.log(`stdout: ${stdout}`);
//     console.error(`stderr: ${stderr}`);
//     server.close();
//   }
// );
