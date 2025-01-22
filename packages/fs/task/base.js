// 所有任务
export const tasks = $.stanz([]);

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

export const addTaskData = (opts) => {
  const tid = Math.random().toString(32).slice(3);

  tasks.push({
    tid,
    ...opts,
    done: false, // 任务是否已经完成
  });

  const targetTask = tasks.find((e) => e.tid === tid);

  return targetTask;
};
