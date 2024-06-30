import "./get-local.js";
import "./get-sub-dir.js";
import "./get-set-file.js";
import "./file-tree.js";

import { get } from "../main.js";

const localRoot = await get("local");

const len = await localRoot.length();

// ok(len === 3, "length ok");

console.log("len: ", len);
