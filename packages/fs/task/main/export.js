import { get } from "../../main.js";
import { addTaskData } from "../base.js";

// 运行导出文件任务
export const runExportFileTask = async (options) => {
  const { from, delayTime } = options;

  if (from.length === 1) {
    const handle = await get(from[0]);

    if (handle.kind === "file") {
      // 直接下载文件
      const file = await handle.file();

      const url = URL.createObjectURL(file);
      const aEle = document.createElement("a");
      aEle.href = url;
      aEle.download = file.name;
      aEle.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
      return;
    }
  }

  for (let path of from) {
    const handle = await get(path);

    debugger;
  }
};
