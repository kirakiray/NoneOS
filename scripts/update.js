import { promises as fs } from "fs";

const puipath = import.meta
  .resolve("../../Punch-UI/packages")
  .replace("file://", "");

const puitarget = import.meta.resolve("../packages/pui").replace("file://", "");

await fs.rm(puitarget, { recursive: true });

await await fs.cp(puipath, puitarget, { recursive: true });

console.log("update pui ok!");
