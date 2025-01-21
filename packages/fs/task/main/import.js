import { get } from "../../main.js";
import { tasks } from "../base.js";

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
      const files = e.target.files;

      const tid = Math.random().toString(32).slice(3);

      tasks.push({
        tid,
        type: "import-folder",
        from: files[0].webkitRelativePath.replace(/(.+)\/.+/, "$1"),
        to,
        step: 1,
        precentage: 0, // 任务进行率 0-1
        done: false, // 任务是否已经完成
      });

      // 查找到目标任务对象并运行
      const targetTask = tasks.find((e) => e.tid === tid);

      const afterFiles = await fileFilter(e.target.files);

      // 写入文件
      const nowHandle = await get(to);

      const total = afterFiles.length;
      let count = 0;
      // this.importedLen = 0;

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

      setTimeout(() => {
        // 删除数据
        const index = tasks.findIndex((e) => e.tid === tid);
        tasks.splice(index, 1);
      }, 2000);

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
