// 当前所有分好组的数据
export const groups = $.stanz([]);

// 询问用户后在执行的任务
export const solicit = (opts) => {
  //   const opts = {
  //     groupTitle: "",
  //     onstart: async () => {}, // 当开始的时候调用触发，获取 prompt
  //     onstream: (data) => {}, // 当有数据返回的时候调用触发，返回数据
  //     onsuccess: (data) => {}, // 当成功的时候调用触发，返回数据
  //     onerror: (data) => {}, // 当失败的时候调用触发，返回数据
  //   };

  const item = {
    tid: Math.random(),
    groupTitle: opts.groupTitle,
    desc: opts.desc,
    state: "waiting", // waiting:等待开始进度 running:运行中 success:成功 failed:失败
    _onstart: opts.onstart,
    _onstream: opts.onstream,
    _onsuccess: opts.onsuccess,
    _onerror: opts.onerror,
  };

  if (!item._onstart) {
    throw new Error("onstart is required");
  }

  let targetGroup = groups.find(
    (e) => e.groupTitle === item.groupTitle && !e.disabled
  );

  if (!targetGroup) {
    targetGroup = {
      gid: Math.random(),
      groupTitle: item.groupTitle,
      groupDesc: item.groupDesc,
      items: [],
      time: Date.now(), // 添加的时间
      disabled: false, // 是否本注销了
    };

    groups.push(targetGroup);

    targetGroup = groups[groups.length - 1];
  }

  targetGroup.items.push(item);

  return () => {
    // 撤销函数
    const index = targetGroup.items.findIndex((e) => e.tid === item.tid);
    if (index !== -1) {
      targetGroup.items.splice(index, 1);

      if (!targetGroup.items.length) {
        // 移除分组
        targetGroup.disabled = true;
      }
    }
  };
};
