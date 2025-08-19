// 当前所有分好组的数据
export const groups = $.stanz([]);
import { ask } from "./ask.js";

// 询问用户后在执行的任务
export const solicit = (opts) => {
  //   const opts = {
  //     groupTitle: "",
  //     execute: false, // 不询问，直接执行
  //     onstart: async () => {}, // 当开始的时候调用触发，获取 prompt
  //     onstream: (data) => {}, // 当有数据返回的时候调用触发，返回数据
  //     onsuccess: (data) => {}, // 当成功的时候调用触发，返回数据
  //     onerror: (data) => {}, // 当失败的时候调用触发，返回数据
  //   };

  let item = {
    tid: Math.random(),
    groupTitle: opts.groupTitle,
    desc: opts.desc,
    state: "waiting", // waiting:等待开始进度 running:运行中 paused:暂停 success:成功 failed:失败
    aiName: "", // 分配的AI名称
    prompt: "", // 提示词
    result: "", // 最终结果
    _target: opts.target, // 寄宿的主体对象
    _onstart: opts.onstart,
    _onstream: opts.onstream,
    _onsuccess: opts.onsuccess,
    _onerror: opts.onerror,
  };

  if (!item._onstart) {
    throw new Error("onstart is required");
  }

  // 查找是否已经出现过相同的元素绑定
  let existItem = null;
  for (const group of groups) {
    for (const e2 of group.items) {
      if (e2._target === item._target) {
        existItem = e2;
        break;
      }
    }
    if (existItem) break;
  }

  if (existItem) {
    existItem._cancel();
  }

  let targetGroup = null;

  // 创建或查找分组的辅助函数
  const createOrFindGroup = () => {
    const group = {
      gid: Math.random(),
      groupTitle: item.groupTitle,
      groupDesc: item.groupDesc,
      state: "waiting", // waiting:等待开始进度 running:运行中 paused:暂停 success:成功 failed:失败 empty:空
      items: [],
      time: Date.now(), // 添加的时间
      _startTask() {
        return startTask(this);
      },
    };

    groups.unshift(group);
    return groups[0];
  };

  if (opts.execute) {
    // 直接开始的不需要分组
    targetGroup = createOrFindGroup();
    targetGroup.items.push(item);
    targetGroup._startTask();
  } else {
    targetGroup = groups.find(
      (e) => e.groupTitle === item.groupTitle && e.state === "waiting"
    );

    if (!targetGroup) {
      targetGroup = createOrFindGroup();
    }

    targetGroup.items.push(item);
  }

  item = targetGroup.items[targetGroup.items.length - 1];

  // 撤销函数
  const cancel = () => {
    if (!(item.state === "running" || item.state === "waiting")) {
      return;
    }

    const index = targetGroup.items.findIndex((e) => e.tid === item.tid);

    if (index !== -1) {
      targetGroup.items.splice(index, 1);

      if (!targetGroup.items.length) {
        // 移除分组
        targetGroup.state = "empty";
      }
    }
  };

  item._cancel = cancel;

  if (item._target) {
    // 监听宿主是否被删除
    item._target.on("detached", () => {
      cancel();
    });
  }

  return cancel;
};

// 开始运行进程
const startTask = async (group) => {
  // 更新状态
  group.state = "running";

  // 开始运行
  for (const item of group.items) {
    item.state = "running";

    // 先获取prompt
    const prompt = await item._onstart();
    item.prompt = prompt;

    // 开始进行翻译
    const result = await ask(prompt, {
      onChunk: (e) => {
        const { modelName, originText, responseText, currentToken } = e;

        if (!item.aiName) {
          item.aiName = modelName;
        }

        item.result = responseText;

        item._onstream && item._onstream(e);
      },
    });

    item.state = "success";
    item.result = result.responseText;
    item._onsuccess && item._onsuccess(result);
  }

  // 全部完成
  group.state = "success";
};
