import fs from "fs/promises";
import path from "path";

const sources = [
  "../dist",
  "../packages",
  "../sw",
  "../install",
  "../others",
  "../sw.js",
  "../index.html",
];

async function copyDirectories() {
  for (const source of sources) {
    const dest = path.join(process.cwd(), path.basename(source));
    try {
      await fs.cp(source, dest, { recursive: true, force: true });
      console.log(`Successfully copied ${source} to ${dest}`);
    } catch (err) {
      console.error(`Error copying ${source}:`, err);
    }
  }
}

copyDirectories();
