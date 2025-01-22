import { get } from "../../main.js";
import { addTaskData } from "../base.js";

export const importFiles = async (options) => {
  const { files } = options;

  debugger;
};

// 导入文件夹
export const runImportFolderTask = async (options) => {
  const { to, delayTime } = options;

  return new Promise((resolve, reject) => {
    const fileEl = document.createElement("input");
    fileEl.type = "file";
    fileEl.webkitdirectory = true;
    fileEl.style.display = "none";
    // fileEl.multiple = true;
    fileEl.onchange = async (e) => {
      const afterFiles = await fileFilter(e.target.files);

      // 查找到目标任务对象并运行
      const targetTask = addTaskData({
        type: "import-folder",
        tips: `正在将 <b>${afterFiles[0].webkitRelativePath.replace(
          /(.+?)\/.+/,
          "$1"
        )}</b>导入到<b>${to}</b>`,
        step: 1,
        precentage: 0, // 任务进行率 0-1
      });

      // 写入文件
      const nowHandle = await get(to);

      const total = afterFiles.length;
      let count = 0;

      for (let file of afterFiles) {
        const handle = await nowHandle.get(
          file.webkitRelativePath || file.name,
          {
            create: "file",
          }
        );

        await handle.write(file);
        targetTask.precentage = (++count / total).toFixed(2);
      }

      targetTask.done = true;

      targetTask.tips = `<b>${afterFiles[0].webkitRelativePath.replace(
        /(.+?)\/.+/,
        "$1"
      )}</b>导入到<b>${to}</b> 成功`;

      resolve();
    };

    fileEl.click();
  });
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

// 导入文件
export const runImportFileTask = async (options) => {
  // <input
  //         type="file"
  //         webkitdirectory
  //         id="imDirInputer"
  //         on:change="importFiles"
  //       />

  debugger;
};
