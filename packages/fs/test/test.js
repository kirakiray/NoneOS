import fs from "../index.mjs";

(async () => {
  await fs.writeFile("/test.js", "alert('It is test.js')");
  await fs.mkdir("/a").catch((err) => console.warn(err));

  await fs.writeFile("/a/a1.js", "alert('It is a1.js')");
  await fs.writeFile("/a/a2.js", "alert('It is a2.js')");
  await fs.mkdir("/a/dir_test").catch((err) => console.warn(err));

  const text = await fs.readFile("/test.js");

  console.log("text => ", text);

  const text2 = await fs.readFile("/b.js").catch((err) => console.warn(err));

  console.log("text2 => ", text2);

  const d1 = await fs.readDir("/");
  console.log("root => ", d1);
  const d2 = await fs.readDir("/a");
  console.log("root => ", d2);

  await fs.writeFile("/t_d1.md", "test md file");
  await fs.removeFile("/t_d1.md");

  await fs.mkdir("/t2");
  await fs.removeDir("/t2");

  await fs.removeFile("/rn_file02");
  await fs.writeFile("/rn_file01", "I am rnfile01");
  await fs.renameFile("/rn_file01", "/rn_file02");

  // await fs.mkdir("/rn_dir01").catch((err) => console.warn(err));
  // await fs.renameDir("/rn_dir01", "/rn_dir02");
})();
