import fs from "../index.mjs";

(async () => {
  await fs.writeFile("/aa.js", "alert('It is aa.js')");
  await fs.mkdir("/a").catch((e) => console.warn(e));
})();
