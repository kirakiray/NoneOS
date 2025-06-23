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

const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export function focusAndSetCursorAtEnd(element) {
  element.focus();

  if (isSafari) {
    return;
  }
  // TODO: safari 有bug，无法对焦到最后
  const range = document.createRange();
  const selection = window.getSelection();

  range.selectNodeContents(element);
  range.collapse(false);

  selection.removeAllRanges();
  selection.addRange(range);
}

export function getFirstLinePosition(range) {
  const rects = range.getClientRects();

  if (rects.length === 0) return null;

  // 第一个矩形就是第一行的位置信息
  const firstLineRect = rects[0];

  return {
    left: firstLineRect.left,
    top: firstLineRect.top,
    width: firstLineRect.width,
    height: firstLineRect.height,
    // 加上滚动偏移量获取绝对位置
    absoluteLeft: firstLineRect.left + window.scrollX,
    absoluteTop: firstLineRect.top + window.scrollY,
  };
}

// 复制一份保留完整外观的元素
export const cloneEditorContent = (ele) => {
  const cloneEl = ele.cloneNode(true);

  const compStyle = getComputedStyle(ele);

  const rectStyle = {};

  for (let key of compStyle) {
    rectStyle[key] = compStyle[key];
  }

  //   // 定义所有和外观样式相关的键名数组
  //   const rectKeys = Object.keys(compStyle).filter((e) => {
  //     return !/\d/.test(e);
  //   });

  //   console.log("rectKeys: ", rectKeys, compStyle, Object.keys(compStyle));

  //   rectKeys.forEach((key) => {
  //     rectStyle[key] = compStyle[key];
  //   });

  Object.assign(cloneEl.style, rectStyle);

  return cloneEl;
};
