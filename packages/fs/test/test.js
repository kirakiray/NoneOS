import { get } from "../main.js";

const localRoot = await get("local");

console.log("handle", localRoot);

const subHandle = await localRoot.get("subDir", {
  create: "dir",
});

console.log("subHandle", subHandle);

// const sub2 = await localRoot.get("subDir2/sub2-1/sbu2-1-1");
const sub2 = await localRoot.get("subDir/sub2-1/sbu2-1-1/111", {});

console.log(sub2);
