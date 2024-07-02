import "../../fs/test/file-tree.js";
import { get } from "../../fs/main.js";
import { ok } from "../../test-util/ok.js";
import { registration } from "../register.js";

const handle = await get("local/test_file.txt", {
  create: "file",
});

const content = `I am test file ${Math.random()}`;

await handle.write(content);

// 确保sw完成
await registration;

ok(true, "registration");

const fetchText = await fetch("/$/local/test_file.txt").then((res) =>
  res.text()
);

ok(fetchText === content, "fetch file content");

{
  const content = `
onmessage = (event)=>{
  setTimeout(()=>{
    postMessage('收到了:' + event.data);
  },500);
}`;

  const handle = await get("local/test_worker.js", {
    create: "file",
  });

  await handle.write(content);

  const worker = new Worker("/$/local/test_worker.js");

  worker.onmessage = (event) => {
    ok(event.data === "收到了:test", "worker");

    worker.terminate();
  };

  worker.postMessage("test");
}
