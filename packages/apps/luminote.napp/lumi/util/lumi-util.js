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

export const getLumiBlock = (event) => {
  const [lumiBlock] = event
    .composedPath()
    .filter((e) => e.tagName === "LUMI-BLOCK");

  return lumiBlock;
};

export const copySelectedBlock = (lumipage) => {
  let textContent = "";
  let htmlContent = "";
  // let mdContent = "";

  const lastIndex = lumipage._selecteds.length - 1;

  lumipage._selecteds.forEach((item, index) => {
    if (!item.textContent) {
      return;
    }

    textContent += item.textContent;
    htmlContent += item.htmlContent;
    // mdContent += item.mdContent;

    if (textContent && index !== lastIndex) {
      textContent += `\n\n`;
      htmlContent += `\n`;
      // mdContent += `\n\n`;
    }
  });

  navigator.clipboard.write([
    new ClipboardItem({
      "text/html": new Blob([htmlContent], { type: "text/html" }),
      "text/plain": new Blob([textContent], { type: "text/plain" }),
      // "text/markdown": new Blob([mdContent], {
      //   type: "text/markdown",
      // }),
    }),
  ]);
};
