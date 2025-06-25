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

// 获取目标在root中的绝对偏移值
export const getRealOffset = (root, node, offset) => {
  if (!root.contains(node)) {
    throw new Error("get offset error");
  }

  let realOffset = 0;

  for (let childNode of Array.from(root.childNodes)) {
    if (childNode === node || childNode.contains(node)) {
      // 达到目标节点
      realOffset += offset;
      break;
    } else {
      // 在目标节点前面,添加位移
      realOffset += childNode.textContent.length;
    }
  }

  return realOffset;
};

// 获取容器元素和相对偏移值
export const getContainerAndOffset = (root, realOffset) => {
  let offset = realOffset;

  const nodes = getAllTextNode(root);

  let container = null;
  let index = 0;
  let total = 0;
  while (total <= offset) {
    container = nodes[index];
    total += nodes[index].textContent.length;
    index++;
  }

  return {
    container,
    offset: total - offset - container.length,
  };
};

// 递归获取所有文本节点
const getAllTextNode = (root) => {
  let arr = [];

  for (let childNode of Array.from(root.childNodes)) {
    if (childNode instanceof Text) {
      arr.push(childNode);
    } else {
      arr.push(...getAllTextNode(childNode));
    }
  }

  return arr;
};

// 将元素转为字数据
export const elementToLetterData = async (node, options = {}) => {
  if (node instanceof Text) {
    return Array.from(node.textContent).map((text) => {
      return {
        text,
        options,
      };
    });
  }

  // 获取样式
  const compStyle = getComputedStyle(node);

  const isBold = parseInt(compStyle.fontWeight) >= 600;
  const { textDecoration } = compStyle;
  const isUnderline = textDecoration.includes("underline");
  const isLineThrough = textDecoration.includes("line-through");
  const isItalic = compStyle.fontStyle === "italic";
  const color = node.style.color;
  const backgroundColor = node.style.backgroundColor;

  const selfOptions = {
    bold: isBold,
    underline: isUnderline,
    lineThrough: isLineThrough,
    italic: isItalic,
    color,
    backgroundColor,
  };

  let arr = [];

  if (node.childNodes) {
    for (let e of Array.from(node.childNodes)) {
      arr.push(...(await elementToLetterData(e, selfOptions)));
    }
  }

  return arr;
};

// 将字数据转为元素
export const letterDataToElement = async (letterData) => {
  let str = "";

  let prevItem = null;
  let hasPrevSpan = false;
  for (const item of letterData) {
    if (
      prevItem &&
      !(
        item.options === prevItem.options ||
        equalOptions(item.options, prevItem.options)
      )
    ) {
      // 样式有改动
      if (hasPrevSpan) {
        str += "</span>";
      }

      const styleStr = getStyleStr(item.options);

      if (styleStr) {
        str += `<span style="${styleStr}">`;
        hasPrevSpan = true;
      } else {
        hasPrevSpan = false;
      }
    }

    str += item.text;

    prevItem = item;
  }

  return str;
};

// 生成style字符串
const getStyleStr = (options) => {
  let styleStr = "";

  if (options.bold) {
    styleStr += "font-weight: bold;";
  }

  if (options.underline && options.lineThrough) {
    styleStr += "text-decoration: underline line-through;";
  } else {
    if (options.underline) {
      styleStr += "text-decoration: underline;";
    } else if (options.lineThrough) {
      styleStr += "text-decoration: line-through;";
    }
  }

  if (options.italic) {
    styleStr += "font-style: italic;";
  }

  if (options.color) {
    styleStr += `color: ${options.color};`;
  }

  return styleStr;
};

const equalOptions = (a, b) => {
  return (
    a.bold === b.bold &&
    a.underline === b.underline &&
    a.italic === b.italic &&
    a.color === b.color &&
    a.lineThrough === b.lineThrough &&
    a.backgroundColor === b.backgroundColor
  );
};
