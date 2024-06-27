import "./get-local.js";
import "./get-sub-dir.js";
import "./get-set-file.js";

import { get } from "../main.js";

const localRoot = await get("local");

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

setTimeout(reloadView, 100);

const len = await localRoot.length();

console.log("len: ", len);
