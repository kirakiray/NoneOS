import { get } from "../../main.js";
import { addTaskData } from "../base.js";
import { getText } from "/packages/i18n/data.js";

// 导入文件夹
export const runImportFolderTask = async (options) => {
  const { to, delayTime } = options;

  return new Promise((resolve, reject) => {
    const fileEl = document.createElement("input");
    fileEl.type = "file";
    fileEl.webkitdirectory = true;
    // fileEl.style.display = "none";
    fileEl.onchange = async (e) => {
      await importFiles({
        files: await fileFilter(e.target.files),
        to,
        delayTime,
      });

      resolve();
    };

    fileEl.click();
  });
};

// 导入文件
export const runImportFileTask = async (options) => {
  const { to, delayTime } = options;

  return new Promise((resolve, reject) => {
    const fileEl = document.createElement("input");
    fileEl.type = "file";
    fileEl.multiple = true;
    // fileEl.style.display = "none";
    fileEl.onchange = async (e) => {
      await importFiles({ files: e.target.files, to, delayTime });

      resolve();
    };

    fileEl.click();
  });
};

const importFiles = async ({ files: afterFiles, to, delayTime }) => {
  const dirName = afterFiles[0].webkitRelativePath
    ? afterFiles[0].webkitRelativePath.replace(/(.+?)\/.+/, "$1")
    : afterFiles[0].name;

  // 查找到目标任务对象并运行
  const targetTask = addTaskData({
    type: "import-folder",
    tips: getText("importFolder", "fs-task", {
      dirName,
      to,
    }),
    step: 1,
    precentage: 0, // 任务进行率 0-1
  });

  try {
    // 写入文件
    const nowHandle = await get(to);

    const total = afterFiles.length;
    let count = 0;

    for (let file of afterFiles) {
      if (delayTime) {
        await new Promise((resolve) => setTimeout(resolve, delayTime));
      }

      const handle = await nowHandle.get(file.webkitRelativePath || file.name, {
        create: "file",
      });

      await handle.write(file);
      targetTask.precentage = (++count / total).toFixed(2);
    }

    targetTask.done = true;

    targetTask.tips = getText("importFolderok", "fs-task", {
      dirName,
      to,
    });
  } catch (err) {
    console.error(err);
    targetTask.error = err.toString();
  }
};

// 过滤掉 node_modules 和 .开头的文件
async function fileFilter(files) {
  const reFiles = Array.from(files).filter((e) => {
    const { webkitRelativePath } = e;

    if (!webkitRelativePath) {
      return true;
    }

    const paths = webkitRelativePath.split("/");

    return !paths.some((e) => {
      return e === "node_modules" || /^\./.test(e);
    });
  });

  return reFiles;
}
