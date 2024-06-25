import { get } from "../main.js";
import { ok } from "./ok.js";

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
  let f1 = "";
  for (let i = 0; i < 1024; i++) {
    f1 += "0";
  }
  for (let i = 0; i < 1024; i++) {
    fcontent += f1;
  }

  let f2 = "";
  for (let i = 0; i < 1024; i++) {
    f2 += "1";
  }
  for (let i = 0; i < 1024; i++) {
    fcontent += f2;
  }

  const fullFile = await get("local/files/sfile2.txt", {
    create: "file",
  });
  await fullFile.write(fcontent);
}
