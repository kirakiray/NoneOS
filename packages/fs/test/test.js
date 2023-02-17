import fs from "../index.mjs";

(async () => {
  await fs.writeFile("/test.js", "alert('It is test.js')");
  await fs.mkdir("/a").catch((e) => console.warn(e));

  await fs.writeFile("/a/a1.js", "alert('It is a1.js')");
  await fs.writeFile("/a/a2.js", "alert('It is a2.js')");

  const text = await fs.readFile("/test.js");

  console.log("text => ", text);

  const text2 = await fs.readFile("/b.js");

  console.log("text2 => ", text2);
})();
