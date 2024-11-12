import { get } from "../main.js";
// import { on } from "../task.js";
const on = () => {};

export const tasks = $.stanz([
  // {
  //   type: "copyTo",
  //   from: "AAA",
  //   to: "bbb",
  //   paused: false // 是否暂停中
  //   showViewer: false // 是否显示查看器
  //   path: '', // 任务目录的地址
  //   completed: false // 任务是否已经完成
  //   total: 1, // 总共需要缓存的块数
  //   totalCached: 0, // 已经缓存的块数
  // },
]);

on("prepare", (e) => {
  // 有新任务加入
  const { data } = e;

  openTask({
    path: data.path,
  });
});

on("writed", (e) => {
  // 更新写入进度
  const { data } = e;

  const item = tasks.find((e) => e.path === data.cachePath);

  if (item) {
    const { totalCached, total } = data;

    item.totalCached = totalCached;
    item.total = total;
  }
});

on("task-complete", (e) => {
  // 任务完成
  const { data } = e;

  const target = tasks.find((e) => {
    return e.path === data.path;
  });

  if (target) {
    target.completed = true;
    target.showViewer = false;

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
    total: 1,
    totalCached: 0,
  });

  setTimeout(() => {
    const exitedItem = tasks.find((e) => e.path === data.path);
    exitedItem.showViewer = true;
  }, 200);
};
