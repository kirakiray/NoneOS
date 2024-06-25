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

const sfile = await localRoot.get("subDir2/sfile1.txt", {
  create: "file",
});

await sfile.write(`I am sfile`);

console.log("sfile", sfile);

const sub3 = await localRoot.get("subDir3/sub3-1/sbu3-1-1", {
  create: "dir",
});

console.log("2 and 3: ", sub2, sub3);

// await localRoot.forEach((e) => {
//   console.log("each: ", e);
// });

for await (let e of localRoot.entries()) {
  console.log("entries: ", e);
}

// 查看文件目录视图
const reloadView = async () => {
  const getEl = async (handle) => {
    let ele = document.createElement("li");
    ele.innerHTML = `${handle.kind}: ${handle.name}`;

    if (handle.kind === "dir") {
      ele.classList.add("dir");
      const ul = document.createElement("ul");

      for await (let item of handle.values()) {
        const subEl = await getEl(item);
        ul.append(subEl);
      }

      ele.append(ul);
    } else {
      ele.classList.add("file");
    }

    return ele;
  };

  const ele = await getEl(localRoot);

  const filelistEl = document.querySelector(".file-list");
  filelistEl.innerHTML = "";
  filelistEl.append(ele);
};

reloadView();
