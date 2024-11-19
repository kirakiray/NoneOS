import { finalGet } from "./init.js";

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

let localRoot;

setTimeout(async () => {
  const get = await finalGet;
  localRoot = await get("local");

  const ul = document.createElement("ul");
  ul.classList.add("file-list");
  document.body.append(ul);

  reloadView(localRoot);
}, 400);

// 查看文件目录视图
export const reloadView = async (targetHandle) => {
  const getEl = async (handle) => {
    let ele = document.createElement("li");
    ele.innerHTML = `${handle.kind}: ${handle.name}`;

    if (handle.kind === "dir") {
      ele.classList.add("dir");
      const ul = document.createElement("ul");

      for await (let item of handle.values()) {
        try {
          if (item.name === "node_modules" || /^\./.test(item.name)) {
            continue;
          }
          const subEl = await getEl(item);
          ul.append(subEl);
        } catch (err) {
          console.log(err, item);
        }
      }
      ele.append(ul);
    } else {
      ele.classList.add("file");
      if (handle._mark === "origin") {
        ele.innerHTML = `${handle.kind}: ${handle.name}`;
      } else {
        ele.innerHTML = `<a href="/$/${handle.path}" target="_blank">${handle.kind}: ${handle.name}</a>`;
      }
    }

    return ele;
  };

  const ele = await getEl(targetHandle);

  const filelistEl = document.querySelector(".file-list");

  if (targetHandle === localRoot) {
    filelistEl.innerHTML = "";
  }
  filelistEl.append(ele);
};
