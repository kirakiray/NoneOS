import { get } from "../main.js";
import { on } from "../task.js";

export const tasks = $.stanz([
  // {
  //   type: "copyTo",
  //   from: "AAA",
  //   to: "bbb",
  //   paused: false // 是否暂停中
  //   showViewer: false // 是否显示查看器
  //   path: '', // 任务目录的地址
  //   completed: false // 任务是否已经完成
  // },
]);

on("prepare", (e) => {
  const { data } = e;

  openTask({
    path: data.path,
  });
});

on("task-complete", (e) => {
  const { data } = e;

  const target = tasks.find((e) => {
    return e.path === data.path;
  });

  if (target) {
    target.completed = true;

    // 延迟删除
    setTimeout(() => {
      const index = tasks.findIndex((e) => e === target);
      if (index > -1) {
        tasks.splice(index, 1);
      }
    }, 2000);
  }

  
});

// 添加任务
export const openTask = async (data) => {
  const handle = await get(`${data.path}/task.json`);
  let taskData = await handle.text();
  if (taskData) {
    taskData = JSON.parse(taskData);
  }

  // 查看是否已经存在
  let exitedItem = tasks.find((e) => e.path === data.path);

  if (exitedItem) {
    exitedItem.showViewer = true;
    return;
  }

  tasks.push({
    type: taskData.type,
    paused: true,
    path: data.path,
    from: taskData.from.replace(/.+\/(.+)$/, "$1"),
    to: taskData.to.replace(/.+\/(.+)$/, "$1"),
    showViewer: false,
  });

  setTimeout(() => {
    const exitedItem = tasks.find((e) => e.path === data.path);
    exitedItem.showViewer = true;
  }, 200);
};
