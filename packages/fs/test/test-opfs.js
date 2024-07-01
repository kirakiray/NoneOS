import { origin } from "../main.js";
const { get } = origin;

const rootHandle = await get("local");

const f1 = await rootHandle.get("a.txt", {
  create: "file",
});

const aa2 = await rootHandle.get("h1/aa2.txt", {
  create: "file",
});

await aa2.write("I am aa2.txt");

const content = await aa2.base64();

await rootHandle.forEach(async (e) => {
  console.log(e);
});
