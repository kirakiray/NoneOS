import { Stanz } from "../../libs/stanz/main.js";

// 所有任务
export const tasks = new Stanz([]);

// 检测到完成的任务，进行清除
tasks.watchTick(() => {
  const doneTasks = tasks.filter((e) => e.done);

  if (doneTasks.length) {
    setTimeout(() => {
      doneTasks.forEach((taskDta) => {
        const index = tasks.findIndex((e) => e.tid === taskDta.tid);
        if (index > -1) {
          tasks.splice(index, 1);
        }
      });
    }, 2000);
  }
}, 500);

export const addTaskItem = (opts) => {
  const tid = Math.random().toString(32).slice(3);

  tasks.push({
    tid,
    name: "", // 显示的内容
    icon: "file", // 任务图标
    color: "primary", // 进度条和左侧图标颜色
    ...opts,
    done: false, // 任务是否已经完成
  });

  const targetTask = tasks.find((e) => e.tid === tid);

  return targetTask;
};
