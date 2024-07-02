import { get as _get, origin } from "../main.js";
import { ok } from "../../test-util/ok.js";

const url = import.meta.url;
const { hash } = new URL(url);
// origin模式下，调用 o-handle
const isOrigin = hash === "#origin";

const get = isOrigin ? origin.get : _get;

const localRoot = await get("local");

const sfile = await localRoot.get("files/sfile1.txt", {
  create: "file",
});

const fileContent = `I am sfile ${Math.random()}`;

await sfile.write(fileContent);

const sfile_2 = await get("local/files/sfile1.txt");

ok(sfile.id === sfile_2.id, "file id");

const reContent = await sfile_2.text();

ok(fileContent === reContent, "read file content");

console.log("file: ", await sfile.file());

{
  let fcontent = "";

  const mbStr = (str) => {
    let f1 = "";
    for (let i = 0; i < 1024; i++) {
      f1 += str;
    }

    let content = "";
    for (let i = 0; i < 1024; i++) {
      content += f1;
    }

    return content;
  };

  fcontent += mbStr("0");
  fcontent += mbStr("1");
  fcontent += mbStr("2");
  fcontent += mbStr("3");

  const fullFile = await get("local/files/Sfile2.txt", {
    create: "file",
  });
  await fullFile.write(fcontent);

  {
    const f2 = await get("local/files/sfile2.txt");

    ok(f2.id === fullFile.id, "file lowercase");
  }

  // 读取完整的数据
  const text1 = await fullFile.text();

  ok(text1 === fcontent, "long text");

  const text2 = await fullFile.text({
    start: 1024 * 1024 - 1,
    end: 1024 * 1024 * 2 + 1,
  });

  ok(text2 === `0${mbStr("1")}2`, "read range");

  const rd = Math.random();
  const rStart = Math.ceil(rd * 1024 * 1024);
  const rEnd = Math.ceil(rd * 1024 * 1024 * 2);

  const b1 = fcontent.slice(rStart, rEnd);

  const text3 = await fullFile.text({
    start: rStart,
    end: rEnd,
  });

  ok(text3 === b1, "read random range");
}
