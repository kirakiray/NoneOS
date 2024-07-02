import { origin } from "../main.js";
const { get } = origin;

const rootHandle = await get("local");

await rootHandle.forEach(async (e) => {
  console.log("each", e);
});

const f1 = await rootHandle.get("a.txt", {
  create: "file",
});

const aa2 = await rootHandle.get("h1/aa2.txt", {
  create: "file",
});

await aa2.write("I am aa2.txt");

const content = await aa2.text();

console.log(content);

const root = await aa2.root();

console.log("root", root);

const parHandle = await aa2.parent();

console.log("parent", parHandle);

// await aa2.remove();

const aa3 = await get("local/h1/aa3.txt");
if (aa3) {
  // const a3_text = await aa3.text();
  await aa3.remove();
}

await aa2.copy("aa3.txt");

const h1_dir = await get("local/h1");

{
  const h2_dir = await get("local/h2_dir");

  if (h2_dir) {
    await h2_dir.remove();
  }
}

const h2_dir = await h1_dir.copy("h2_dir");
