import { setSpace, getText } from "/packages/i18n/data.js";
import { addTaskItem } from "./base.js";

setSpace("fs-task", new URL("/packages/fs/task/lang", location.href));

// 添加任务
export const addTask = async () => {};

// 导入文件
export const importFile = async (to) => {
  const taskItem = addTaskItem({
    icon: "file",
    name: "等待选择文件",
  });

  const files = await new Promise((resolve, reject) => {
    const fileEl = document.createElement("input");
    fileEl.type = "file";
    fileEl.multiple = true;
    fileEl.onchange = async (e) => {
      resolve(e.target.files);
    };
    fileEl.oncancel = () => {
      taskItem.name = "已取消导入文件";
      taskItem.done = true;
      reject();
    };

    fileEl.click();
  });

  debugger;
};

// setTimeout(() => {
//   let taskItem = addTaskItem({
//     icon: "file",
//     name: "等待选择文件",
//   });

//   setTimeout(() => {
//     taskItem = addTaskItem({
//       icon: "file",
//       name: "等待选择文件22",
//     });
//   }, 800);

//   setTimeout(() => {
//     taskItem.done = true;
//   }, 1500);
// }, 100);
