// 当前所有分好组的数据
export const groups = $.stanz([]);

// 询问用户后在执行的任务
export const solicit = (opts) => {
  //   const opts = {
  //     groupName: "",
  //     onstart: async () => {}, // 当开始的时候调用触发，获取 prompt
  //     onstream: (data) => {}, // 当有数据返回的时候调用触发，返回数据
  //     onsuccess: (data) => {}, // 当成功的时候调用触发，返回数据
  //     onerror: (data) => {}, // 当失败的时候调用触发，返回数据
  //   };

  const item = {
    groupName: opts.groupName,
    groupDesc: opts.groupDesc,
    _onstart: opts.onstart,
    _onstream: opts.onstream,
    _onsuccess: opts.onsuccess,
    _onerror: opts.onerror,
  };

  if (!item._onstart) {
    throw new Error("onstart is required");
  }

  let targetGroup = groups.find((e) => e.groupName === item.groupName);

  if (!targetGroup) {
    targetGroup = {
      groupName: item.groupName,
      groupDesc: item.groupDesc,
      items: [item],
      time: Date.now(), // 添加的时间
    };

    groups.push(targetGroup);
  }

  return () => {
    // 撤销函数
    const index = targetGroup.items.findIndex((e) => e === item);
    if (index !== -1) {
      targetGroup.items.splice(index, 1);
    }
  };
};
