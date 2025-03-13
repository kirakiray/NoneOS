import { setSpace } from "/packages/i18n/data.js";
import { runDeleteTask } from "./main/delete.js";
import { runImportFolderTask, runImportFileTask } from "./main/import.js";
import { runExportFileTask } from "./main/export.js";
import { copyTo, runCopyTask } from "./main/copy.js";
import { tasks } from "./base.js";

setSpace("fs-task", new URL("/packages/fs/task/lang", location.href));

// 添加任务
export const addTask = async ({ type, from, to, delayTime, paused }) => {
  // 查看是否已经村子啊
  const exited = tasks.find((e) => e.from === from && e.to === to);

  if (exited) {
    exited.showViewer = true;
    return;
  }

  if (type === "delete") {
    await runDeleteTask({ from, delayTime });
  } else if (type === "import-folder") {
    await runImportFolderTask({ to, delayTime });
  } else if (type === "import-files") {
    await runImportFileTask({ to, delayTime });
  } else if (type === "export-files") {
    await runExportFileTask({ from, delayTime });
  } else if (type === "copy") {
    await runCopyTask({ from, to, delayTime });
  }
};

export { copyTo, runDeleteTask, tasks };
