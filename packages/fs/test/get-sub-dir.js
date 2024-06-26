import { get } from "../main.js";
import { ok } from "./ok.js";

const localRoot = await get("local");

const subHandle = await get("local/subDir", {
  create: "dir",
});

ok(subHandle.name === "subDir", "get subDir");

const subHandle_2 = await localRoot.get("subDir");

ok(subHandle.id === subHandle_2.id, "multi handle Id");

const sub3 = await localRoot.get("subDir3/sub3-1/sbu3-1-1", {
  create: "dir",
});

ok(sub3.path === "local/subDir3/sub3-1/sbu3-1-1", "dir path");

for await (let e of localRoot.entries()) {
  console.log("entries: ", e);
}
