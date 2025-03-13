import { setSpace, getText } from "/packages/i18n/data.js";
import { addTaskItem } from "./base.js";

setSpace("fs-task", new URL("/packages/fs/task/lang", location.href));

// 添加任务
export const addTask = async () => {};

// 导入文件
export const importFile = async (to) => {
  const taskItem = addTaskItem({
    icon: "delete",
    name: "等待选择文件",
  });

  const files = await new Promise((resolve, reject) => {
    const fileEl = document.createElement("input");
    fileEl.type = "file";
    fileEl.multiple = true;
    fileEl.onchange = async (e) => {
      debugger;
      resolve(e.target.files);
    };

    fileEl.click();
  });

  debugger;
};
