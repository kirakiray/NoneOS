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

// 获取目标在root中的真实偏移量
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

// // 递归解析元素为字数据
// const toLetterData = (
//   node,
//   opts = {
//     t: [],
//   }
// ) => {
//   const arr = [];
//   if (node instanceof Text) {
//     Array.from(node.textContent).forEach((letter) => {
//       arr.push({
//         l: letter,
//         ...opts,
//       });
//     });
//   } else if (node.childNodes) {
//     const childNodes = Array.from(node.childNodes);

//     const tag = node.tagName.toLowerCase();

//     debugger;

//     childNodes.forEach((childNode) => {
//       const t = [...opts.t];

//       if (!t.includes(tag)) {
//         t.push(tag);
//         t.sort();
//       }

//       arr.push(
//         ...toLetterData(childNode, {
//           t,
//         })
//       );
//     });
//   }

//   return arr;
// };

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
    a.backgroundColor === b.backgroundColor
  );
};
