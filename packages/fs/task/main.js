import { setSpace, getText } from "/packages/i18n/data.js";
import { addTaskItem } from "./base.js";
import { get } from "/packages/fs/main.js";
import { zips } from "/packages/libs/zip/main.js";

let spacePath;

try {
  spacePath = import.meta.resolve("./lang");
} catch (err) {
  spacePath = new URL("/packages/fs/task/lang", location.href);
}

setSpace("fs-task", spacePath);

// 导入文件
export const importFile = async (to) => {
  const taskItem = addTaskItem({
    icon: "file",
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
      taskItem.name = getText("cancelImportFile", "fs-task");
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

  taskItem.name = getText("importFileSuccess", "fs-task");
  taskItem.done = true;
};

// 导入文件夹
export const importDir = async (to) => {
  const taskItem = addTaskItem({
    icon: "folder",
    name: getText("waitSelectFolder", "fs-task"),
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
      taskItem.name = getText("cancelImportFolder", "fs-task");
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
    taskItem.name = getText("importingFolder", "fs-task", {
      filename: file.name,
    });
    taskItem.precentage = count / files.length;
    const fileHandle = await targetDirHandle.get(file.webkitRelativePath, {
      create: "file",
    });
    await fileHandle.write(file);
  }

  taskItem.name = getText("importFolderSuccess", "fs-task", {
    foldername: files[0].webkitRelativePath.replace(/(.+?)\/.+/, "$1"),
  });
  taskItem.done = true;
};

// 删除文件
export const deleteHandle = async (paths) => {
  const taskItem = addTaskItem({
    icon: "delete",
    name: getText("deleting", "fs-task"),
  });

  let count = 0;

  for (let path of paths) {
    count++;
    taskItem.name = getText("deletingFile", "fs-task", {
      filename: path,
    });
    taskItem.precentage = count / paths.length;
    const handle = await get(path);
    await handle.remove();
  }

  taskItem.name = getText("deleteSuccess", "fs-task");
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
    name: getText("copyingFiles", "fs-task", {
      sourcename: fromHandles[0].name,
      targetname: toHandle.name,
    }),
  });

  for (let handle of fromHandles) {
    taskItem.name = getText("copyingFile", "fs-task", {
      sourcename: handle.name,
      targetname: toHandle.name,
    });
    await handle.copyTo(toHandle);
  }

  taskItem.name = getText("copySuccess", "fs-task", {
    filename: fromHandles[0].name,
  });

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
    name: getText("movingFiles", "fs-task", {
      sourcename: fromHandles[0].name,
      targetname: toHandle.name,
    }),
  });

  for (let handle of fromHandles) {
    taskItem.name = getText("movingFile", "fs-task", {
      sourcename: handle.name,
      targetname: toHandle.name,
    });
    await handle.moveTo(toHandle);
  }

  taskItem.name = getText("moveSuccess", "fs-task", {
    filename: fromHandles[0].name,
  });

  setTimeout(() => {
    // 复制可能太快了，所以要延迟一下
    taskItem.done = true;
  }, 300);
};

// 导出文件
export const exportHandle = async (paths) => {
  const taskItem = addTaskItem({
    icon: "file",
    name: getText("exporting", "fs-task"),
  });

  if (paths.length === 1) {
    const handle = await get(paths[0]);

    if (handle.kind === "file") {
      const file = await handle.file();

      taskItem.done = true;
      taskItem.name = getText("exportFileSuccess", "fs-task", {
        filename: handle.name,
      });
      return downloadFile(file);
    }
  }

  taskItem.name = getText("packingFiles", "fs-task");

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

  taskItem.name = getText("exportSuccess", "fs-task");
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
