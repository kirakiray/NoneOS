import { setSpace, getText } from "/packages/i18n/data.js";
import { addTaskItem } from "./base.js";
import { get } from "/packages/fs/main.js";

setSpace("fs-task", new URL("/packages/fs/task/lang", location.href));

// 添加任务
export const addTask = async () => {};

// 导入文件
export const importFile = async (to) => {
  const taskItem = addTaskItem({
    icon: "file",
    name: "等待选择文件",
  });

  const files = await new Promise((resolve) => {
    const fileEl = document.createElement("input");
    fileEl.type = "file";
    fileEl.multiple = true;
    fileEl.onchange = async (e) => {
      resolve(Array.from(e.target.files));
    };
    fileEl.oncancel = () => {
      taskItem.name = "已取消导入文件";
      taskItem.done = true;
      resolve(null);
    };

    fileEl.click();
  });

  if (!files) return;

  // 将文件导入到这个目录
  const targetDirHandle = await get(to);

  let count = 0;

  for (let file of files) {
    count++;
    taskItem.name = `正在导入文件: ${file.name}`;
    taskItem.precentage = count / files.length;

    const fileHandle = await targetDirHandle.get(file.name, {
      create: "file",
    });

    await fileHandle.write(file);
  }

  taskItem.name = "导入文件成功";
  taskItem.done = true;
};

// 导入文件夹
export const importDir = async (to) => {
  const taskItem = addTaskItem({
    icon: "folder",
    name: "等待选择文件夹",
  });

  const files = await new Promise((resolve) => {
    const dirEl = document.createElement("input");
    dirEl.type = "file";
    dirEl.multiple = false;
    dirEl.webkitdirectory = true;
    dirEl.onchange = async (e) => {
      resolve(e.target.files);
    };
    dirEl.oncancel = () => {
      taskItem.name = "已取消导入文件夹";
      taskItem.done = true;
      resolve(null);
    };
    dirEl.click();
  });
  if (!files) return;

  // 将文件夹导入到这个目录
  const targetDirHandle = await get(to);

  let count = 0;
  for (let file of files) {
    count++;
    taskItem.name = `正在导入文件: ${file.name}`;
    taskItem.precentage = count / files.length;
    const fileHandle = await targetDirHandle.get(file.webkitRelativePath, {
      create: "file",
    });
    await fileHandle.write(file);
  }

  taskItem.name = `导入文件夹 <b>${files[0].webkitRelativePath.replace(
    /(.+?)\/.+/,
    "$1"
  )}</b> 成功`;
  taskItem.done = true;
};

// 删除文件
export const deleteHandle = async (paths) => {
  const taskItem = addTaskItem({
    icon: "file",
    name: "正在删除文件",
  });

  let count = 0;

  for (let path of paths) {
    count++;
    taskItem.name = `正在删除文件: ${path}`;
    taskItem.precentage = count / paths.length;
    const handle = await get(path);
    await handle.remove();
  }

  taskItem.name = "删除文件成功";
  setTimeout(() => {
    // 删除都太快了，所以要延迟一下
    taskItem.done = true;
  }, 300);
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
