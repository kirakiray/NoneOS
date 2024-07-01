const styleEl = document.createElement("style");
styleEl.innerHTML = `
    <style>
      .file-list ul {
        padding: 0 0 0 16px;
      }
      .file-list .dir {
        color: rgb(133, 11, 11);
      }
      .file-list .file {
        color: rgb(8, 8, 136);
      }
    </style>`;

document.head.appendChild(styleEl);

const ul = document.createElement("ul");
ul.classList.add("file-list");
document.body.append(ul);

import { get, origin } from "../main.js";

const url = import.meta.url;
const { hash } = new URL(url);

let localRoot;

// origin模式下，调用 op-handle
const isOrigin = hash === "#origin";
if (isOrigin) {
  localRoot = await origin.get("local");
} else {
  localRoot = await get("local");
}

// 查看文件目录视图
export const reloadView = async () => {
  const getEl = async (handle) => {
    let ele = document.createElement("li");
    ele.innerHTML = `${handle.kind}: ${handle.name}`;

    if (handle.kind === "dir") {
      ele.classList.add("dir");
      const ul = document.createElement("ul");

      for await (let item of handle.values()) {
        try {
          const subEl = await getEl(item);
          ul.append(subEl);
        } catch (err) {
          console.log(err, item);
        }
      }
      ele.append(ul);
    } else {
      ele.classList.add("file");
      if (isOrigin) {
        ele.innerHTML = `${handle.kind}: ${handle.name}`;
      } else {
        ele.innerHTML = `<a href="/$/${handle.path}" target="_blank">${handle.kind}: ${handle.name}</a>`;
      }
    }

    return ele;
  };

  const ele = await getEl(localRoot);

  const filelistEl = document.querySelector(".file-list");
  filelistEl.innerHTML = "";
  filelistEl.append(ele);
};

setTimeout(reloadView, 400);
