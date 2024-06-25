import { get } from "../main.js";
import { ok } from "./ok.js";

const localRoot = await get("local");

const sfile = await localRoot.get("files/sfile1.txt", {
  create: "file",
});

const rid = Math.random();

await sfile.write(`I am sfile ${rid}`);

const sfile_2 = await get("local/files/sfile1.txt");

ok(sfile.id === sfile_2.id, "file id");

const reContent = await sfile_2.text();
