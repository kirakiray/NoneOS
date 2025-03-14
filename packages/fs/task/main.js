import { setSpace, getText } from "/packages/i18n/data.js";
import { addTaskItem } from "./base.js";
import { get } from "/packages/fs/main.js";
import { zips } from "/packages/libs/zip/main.js";

setSpace("fs-task", new URL("/packages/fs/task/lang", location.href));

// 添加任务
export const addTask = async () => {};

// 导入文件
export const importFile = async (to) => {
  const taskItem = addTaskItem({
    icon: "file",
    // name: "等待选择文件",
    name: getText("waitSelectFile", "fs-task"),
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
    // taskItem.name = `正在导入文件: ${file.name}`;
    taskItem.name = getText("importingFile", "fs-task", {
      filename: file.name,
    });
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
    icon: "delete",
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

// 将文件复制到指定目录
export const copyHandle = async (froms, to) => {
  const fromHandles = await Promise.all(froms.map(async (path) => get(path)));
  const toHandle = await get(to);

  const taskItem = addTaskItem({
    icon: "copy",
    name: `正在将<b>${fromHandles[0].name}</b>等复制到<b>${toHandle.name}</b>`,
  });

  for (let handle of fromHandles) {
    taskItem.name = `正在将<b>${handle.name}</b>复制到<b>${toHandle.name}</b>`;
    await handle.copyTo(toHandle);
  }

  taskItem.name = `复制<b>${fromHandles[0].name}等</b>成功`;

  setTimeout(() => {
    // 复制可能太快了，所以要延迟一下
    taskItem.done = true;
  }, 300);
};

// 将文件剪切到指定目录
export const moveHandle = async (froms, to) => {
  const fromHandles = await Promise.all(froms.map(async (path) => get(path)));
  const toHandle = await get(to);

  const taskItem = addTaskItem({
    icon: "cut",
    name: `正在将<b>${fromHandles[0].name}</b>等剪切到<b>${toHandle.name}</b>`,
  });

  for (let handle of fromHandles) {
    taskItem.name = `正在将<b>${handle.name}</b>剪切到<b>${toHandle.name}</b>`;
    await handle.moveTo(toHandle);
  }

  taskItem.name = `剪切<b>${fromHandles[0].name}等</b>成功`;

  setTimeout(() => {
    // 复制可能太快了，所以要延迟一下
    taskItem.done = true;
  }, 300);
};

// 导出文件
export const exportHandle = async (paths) => {
  const taskItem = addTaskItem({
    icon: "file",
    name: "正在导出文件",
  });

  if (paths.length === 1) {
    const handle = await get(paths[0]);

    if (handle.kind === "file") {
      const file = await handle.file();

      taskItem.done = true;
      taskItem.name = `导出文件 <b>${handle.name}</b> 成功`;
      return downloadFile(file);
    }
  }

  // 获取所有文件
  const files = [];

  taskItem.name = "正在打包文件";

  await Promise.all(
    paths.map(async (path) => {
      const handle = await get(path);
      const afterPath = path.split("/").slice(0, -1).join("/");

      if (handle.kind === "dir") {
        const flatFileHandles = await handle.flat();

        await Promise.all(
          flatFileHandles.map(async (item) => {
            const file = await item.file();

            // 修正最终地址
            const fixedPath = item.path.replace(afterPath + "/", "");

            files.push({
              path: fixedPath,
              file,
            });
          })
        );
      } else {
        // 文件
        debugger;
      }
    })
  );

  const finnalFile = await zips(files);

  downloadFile(finnalFile);

  taskItem.name = "导出成功";
  setTimeout(() => {
    taskItem.done = true;
  }, 300);
};

// 下载文件
const downloadFile = async (finnalFile) => {
  const url = URL.createObjectURL(finnalFile);
  const aEle = document.createElement("a");
  aEle.href = url;
  aEle.download = finnalFile.name;
  aEle.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
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
