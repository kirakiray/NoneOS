import { finalGet } from "./init.js";
import { ok } from "./ok.js";

(async () => {
  const get = await finalGet;

  // 剪切文件夹后，确保能再次访问
  const mFile = await get("local/testmove/file.txt", {
    create: "file",
  });

  await mFile.write("test move dir");

  const move2Dir = await get("local/testmove2", {
    create: "dir",
  });

  const m1 = await get("local/testmove");

  await m1.moveTo(move2Dir);

  const mFile_2 = await get("local/testmove2/testmove/file.txt");

  ok((await mFile_2.text()) === "test move dir", "moveTo file");

  // rename
  await move2Dir.moveTo("testmove3");

  const mFile_3 = await get("local/testmove3");

  ok(mFile_3.id === move2Dir.id, "rename dir");

  await move2Dir.remove();
})();
