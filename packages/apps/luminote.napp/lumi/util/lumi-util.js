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
    let itemHtml = item.htmlContent;
    let itemText = item.mdContent;

    if (item.itemData.tab) {
      const temp = $(`<template>${item.htmlContent}</template>`);
      const child1 = temp.ele.content.children[0];
      child1.dataset.tabcount = item.itemData.tab;
      itemHtml = child1.outerHTML;
      itemText = "  ".repeat(item.itemData.tab) + itemText;
    }

    textContent += itemText;
    htmlContent += itemHtml;

    if (textContent && index !== lastIndex) {
      const nextItem = lumipage._selecteds[index + 1];
      if (nextItem && nextItem.itemData.tab) {
        textContent += "\n";
      } else {
        textContent += `\n\n`;
      }
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

export const deleteSelectedBlock = (lumipage) => {
  // 逐个删除内容
  const { content } = lumipage.itemData;

  const rangData = lumipage._selecteds.map((e) => e.itemData);

  // 提前获取下一个要聚焦的元素
  const nextFocusBlock =
    lumipage._selecteds.slice(-1)[0].next || lumipage._selecteds[0].prev;

  rangData.forEach((item) => {
    if (item.type === "article") {
      item.removed = true;
    } else {
      const index = content.indexOf(item);
      content.splice(index, 1);
    }
  });

  lumipage._selecteds = null;

  // 聚焦到选区最下的元素上
  if (nextFocusBlock) {
    setTimeout(() => {
      nextFocusBlock.focus("end");
    });
  }
};
