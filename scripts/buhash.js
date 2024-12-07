import fs from "fs/promises";
import { getFilesAndHashes } from "./get-files-and-hashes.js";

(async () => {
  try {
    let pgjson = await fs.readFile("./package.json", "utf-8");
    pgjson = JSON.parse(pgjson);

    const files = await getFilesAndHashes("./packages");

    // 写入得到的数据
    await fs.writeFile(
      "./files.json",
      JSON.stringify({
        data: {
          files,
          version: pgjson.version,
        },
      })
    );

    console.log(files);
  } catch (err) {
    console.error(err);
  }
})();
