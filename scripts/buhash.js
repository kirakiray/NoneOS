import fs from "fs/promises";
import { getFilesAndHashes } from "./get-files-and-hashes.js";

(async () => {
  try {
    const files = await getFilesAndHashes("./packages");

    // 写入得到的数据
    await fs.writeFile(
      "./files.json",
      JSON.stringify({
        files,
      })
    );

    console.log(files);
  } catch (err) {
    console.error(err);
  }
})();
