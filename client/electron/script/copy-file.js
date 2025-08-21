import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sources = [
  "../../dist",
  "../../packages",
  "../../sw",
  "../../install",
  "../../others",
  "../../recovery",
  "../../sw.js",
  "../../index.html",
  "../../package.json",
];

async function copyDirectories() {
  for (const source of sources) {
    const dest = path.join(__dirname, "..", "sources", path.basename(source));
    try {
      await fs.cp(source, dest, { recursive: true, force: true });
      console.log(`Successfully copied ${source} to ${dest}`);
    } catch (err) {
      console.error(`Error copying ${source}:`, err);
    }
  }
}

copyDirectories();
