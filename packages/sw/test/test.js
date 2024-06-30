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

const fetchText = await fetch("/$/local/test_file.txt").then((res) =>
  res.text()
);

ok(fetchText === content, "fetch file content");
