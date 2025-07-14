// 队列中的block元素
const blocks = [];
let running = false;
export const addLoadingTask = (lumiBlock) => {
  blocks.push(lumiBlock);

  if (!running) {
    runBlock();
  }
};

export const removeLoadingTask = (lumiBlock) => {
  const index = blocks.indexOf(lumiBlock);
  if (index !== -1) {
    blocks.splice(index, 1);
  }
};

// 按顺序渲染组件，防止页面卡顿
export const runBlock = async () => {
  running = true;

  const current = blocks.shift();

  current.loading = false;

  await new Promise((res) => setTimeout(res, 0)); // 异步渲染组件

  if (blocks.length) {
    runBlock();
  } else {
    running = false;
  }
};

import { inlineComps } from "../inline/config.js";

{
  // 加载组件
  const load = lm();
  inlineComps.forEach((e) => {
    load(e.inlineComponentSrc);
    load(e.formComponentSrc);
  });
}
