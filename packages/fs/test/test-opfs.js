import { origin } from "../main.js";
const { get } = origin;

const rootHandle = await get("local");

const f1 = await rootHandle.get("a.txt", {
  create: "file",
});

const f1_2 = await rootHandle.get("h1/aa2.txt", {
  create: "file",
});

await rootHandle.forEach(async (e) => {
  console.log(e);
});
