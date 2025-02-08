// import { get } from "../../fs/handle/index.js";
import { ok } from "./ok.js";
import { registration } from "../register.js";

// 确保sw完成
await registration;

ok(true, "registration");

// 等待注册完成后在进行数据库初始化操作，防止同时注册多个数据库导致的失败问题

const { get } = await import("../../fs/handle/index.js");

const handle = await get("local/test_file.txt", {
  create: "file",
});

const content = `I am test file ${Math.random()}`;

await handle.write(content);

const timer = setInterval(async () => {
  const fetchText = await fetch("/$/local/test_file.txt").then((res) =>
    res.text()
  );

  if (fetchText === content) {
    ok(fetchText === content, "fetch file content");
    clearInterval(timer);
  }
}, 500);

// worker test
// {
//   const content = `
// onmessage = (event)=>{
//   setTimeout(()=>{
//     postMessage('收到了:' + event.data);
//   },500);
// }`;

//   const handle = await get("local/test_worker.js", {
//     create: "file",
//   });

//   await handle.write(content);

//   const worker = new Worker("/$/local/test_worker.js");

//   worker.onmessage = (event) => {
//     ok(event.data === "收到了:test", "worker");

//     worker.terminate();
//   };

//   worker.postMessage("test");
// }
