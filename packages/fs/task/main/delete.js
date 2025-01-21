import { confirm } from "/packages/pui/util.js";
import { get } from "../../main.js";
import { tasks } from "../base.js";

// 删除文件的任务
export const runDeleteTask = async ({ from: fromPath, delayTime }) => {
  const result = await confirm({
    content: `确认删除 ${fromPath}？`,
  });

  if (!result) {
    return false;
  }

  const tid = Math.random().toString(32).slice(3);

  tasks.push({
    tid,
    type: "delete",
    from: fromPath,
    delayTime,
    step: 3,
    precentage: 0, // 任务进行率 0-1
    done: false, // 任务是否已经完成
  });

  // 查找到目标任务对象并运行
  const targetTask = tasks.find((e) => e.tid === tid);

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
      targetTask.precentage = (++count / total).toFixed(2);
    });
  }

  targetTask.done = true;

  setTimeout(() => {
    // 删除数据
    const index = tasks.findIndex((e) => e.tid === tid);
    tasks.splice(index, 1);
  }, 2000);
};
