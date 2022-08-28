import { writeDB, readDB, initRoot } from "./base.mjs";
export { default as mkdir } from "./mkdir.mjs";

initRoot();

export default {
  writeDB,
  readDB,
};
