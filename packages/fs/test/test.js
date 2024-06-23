import { get } from "../main.js";

const localRoot = await get("local");

console.log("handle", localRoot);

const subHandle = await localRoot.get("subDir", {
  create: "dir",
});

console.log("subHandle", subHandle);

const sub2 = await localRoot.get("subDir2/sub2-1", {
  create: "dir",
});
const sub3 = await localRoot.get("subDir3/sub3-1/sbu3-1-1", {
  create: "dir",
});

console.log("2 and 3: ", sub2, sub3);

await localRoot.forEach((e) => {
  console.log("each: ", e);
});

for await (let e of localRoot.entries()) {
  console.log("entries: ", e);
}
