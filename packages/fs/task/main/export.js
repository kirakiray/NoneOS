import { get } from "../../main.js";
import { addTaskData } from "../base.js";
import { handleToZip } from "/packages/apps/files/util.js";
import { getText } from "/packages/i18n/data.js";

// 运行导出文件任务
export const runExportFileTask = async (options) => {
  const { from, delayTime } = options;

  const targetTask = await addTaskData({
    tips: ``,
  });

  try {
    if (from.length === 1) {
      const handle = await get(from[0]);

      targetTask.tips = getText("download", "fs-task", {
        handleName: handle.name,
      });

      let finnalFile;

      if (handle.kind === "file") {
        // 直接下载文件
        finnalFile = await handle.file();
      } else if (handle.kind === "dir") {
        finnalFile = await handleToZip(handle);
      }

      const url = URL.createObjectURL(finnalFile);
      const aEle = document.createElement("a");
      aEle.href = url;
      aEle.download = handle.name || finnalFile.name;
      aEle.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);

      targetTask.tips = getText("exportok", "fs-task", {
        handleName: handle.name,
      });
      targetTask.done = true;
      return;
    }

    // TODO: 多文件导出
    debugger;
  } catch (err) {
    console.error(err);
    targetTask.error = err.toString();
  }
};
