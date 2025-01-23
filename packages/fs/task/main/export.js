import { get } from "../../main.js";
import { addTaskData } from "../base.js";
import { handleToZip } from "/packages/apps/files/util.js";

// 运行导出文件任务
export const runExportFileTask = async (options) => {
  const { from, delayTime } = options;

  if (from.length === 1) {
    const handle = await get(from[0]);

    const targetTask = await addTaskData({
      tips: `正在下载 <b>${handle.name}</b>`,
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

    targetTask.tips = `导出 <b>${handle.name}</b> 成功`;
    targetTask.done = true;
    return;
  }

  // TODO: 多文件导出
  debugger;
};
