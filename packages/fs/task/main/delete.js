import { confirm } from "/packages/pui/util.js";
import { get } from "../../main.js";
import { addTaskData } from "../base.js";

// 运行删除文件的任务
export const runDeleteTask = async ({ from: fromPath, delayTime }) => {
  const result = await confirm({
    content: `确认删除 ${fromPath}？`,
  });

  if (!result) {
    return false;
  }

  // 查找到目标任务对象并运行
  const targetTask = addTaskData({
    type: "delete",
    from: fromPath,
    step: 3,
    precentage: 0, // 任务进行率 0-1
  });

  // 文件总数
  let total = 0;
  const allHandles = [];

  // 计算总数
  await Promise.all(
    fromPath.map(async (path) => {
      const targetHandle = await get(path);
      allHandles.push(targetHandle);
      const flats = await targetHandle.flat();
      total += flats.length + 1;
    })
  );
  let count = 0;
  for (let handle of allHandles) {
    await handle.remove((e) => {
      const pCount = ++count / total;
      targetTask.precentage = pCount > 1 ? 1 : pCount.toFixed(2);
    });
  }

  targetTask.done = true;
};
