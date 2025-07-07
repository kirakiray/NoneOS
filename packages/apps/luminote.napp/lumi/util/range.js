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
    if (!nodes[index]) {
      break;
    }
    container = nodes[index];
    total += container.textContent.length;
    index++;
  }

  return {
    container,
    // offset: total - offset - container.length,
    offset: Math.abs(total - offset - container.length),
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

const attributesToObject = (element) =>
  Array.from(element.attributes).reduce(
    (obj, { name, value }) => ((obj[name] = value), obj),
    {}
  );

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

  // 将内联组件转换为span，防止干扰
  if (node.querySelector("[custom-inline-component]")) {
    node = node.cloneNode(true);
    const comps = node.querySelectorAll("[custom-inline-component]");
    comps.forEach((e) => {
      const innerHTML = e.innerHTML;

      const attrs = attributesToObject(e);
      delete attrs["custom-inline-component"];

      // 将属性更新到挂在的span上
      e.parentNode.setAttribute(
        "custom-comp",
        encodeURI(
          JSON.stringify({
            tag: e.tagName.toLowerCase(),
            ...attrs,
          })
        )
      );
      e.parentNode.innerHTML = innerHTML;
    });
  }

  // 获取样式
  const compStyle = getComputedStyle(node);
  const selfStyle = node.style;

  const isBold =
    parseInt(selfStyle.fontWeight) >= 600 ||
    parseInt(compStyle.fontWeight) >= 600;

  const isUnderline =
    selfStyle.textDecoration.includes("underline") ||
    compStyle.textDecoration.includes("underline");
  const isLineThrough =
    selfStyle.textDecoration.includes("line-through") ||
    compStyle.textDecoration.includes("line-through");
  const isItalic =
    selfStyle.fontStyle === "italic" || compStyle.fontStyle === "italic";
  const color = selfStyle.color;
  const backgroundColor = selfStyle.backgroundColor;
  const comp = node.getAttribute("custom-comp");

  const selfOptions = {
    bold: isBold,
    underline: isUnderline,
    lineThrough: isLineThrough,
    italic: isItalic,
    color,
    backgroundColor,
  };

  if (comp) {
    selfOptions.comp = JSON.parse(decodeURI(comp));
  }

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

  let prevItem = null; // 上一个元素
  let hasPrevSpan = false; // 是否有上一个span
  for (let len = letterData.length, i = 0, last = len - 1; i < len; i++) {
    const item = letterData[i];

    if (prevItem && !equalOptions(item.options, prevItem.options)) {
      // 样式有改动
      if (hasPrevSpan) {
        str += "</span>";
      }

      const styleStr = getStyleStr(item.options);
      const compPropStr = getCompPropStr(item.options.comp);
      if (styleStr || compPropStr) {
        str += `<span style="${styleStr}"${compPropStr}>`;
        hasPrevSpan = true;
      } else {
        hasPrevSpan = false;
      }
    } else if (!prevItem && hasOptsData(item.options)) {
      const styleStr = getStyleStr(item.options);
      const compPropStr = getCompPropStr(item.options.comp);
      str += `<span style="${styleStr}"${compPropStr}>`;
      hasPrevSpan = true;
    }

    str += item.text;

    prevItem = item;

    // 当是最后一个item时，又存在prevSpan，需要关闭
    if (i === last && hasPrevSpan) {
      str += "</span>";
    }
  }

  {
    // 修正自定义组件内容
    const tempEl = $(`<template>${str}</template>`);
    const customComps = tempEl.all("[custom-comp]");
    if (customComps.length) {
      customComps.forEach((spanEl) => {
        const compData = JSON.parse(decodeURI(spanEl.attr("custom-comp")));
        const data = { ...compData };
        delete data.tag;

        let propStr = "";
        for (let [key, value] of Object.entries(data)) {
          // key中的大小写改为-驼峰
          key = key.replace(/([A-Z])/g, "-$1").toLowerCase();

          propStr += ` ${key}="${value}"`;
        }

        // 创建组件
        const compEl = $(
          `<${compData.tag}${propStr} custom-inline-component>${spanEl.html}</${compData.tag}>`
        );

        // 塞入组件
        spanEl.html = compEl.ele.outerHTML;

        // 去除 custom-comp 的内容
        spanEl.attr("custom-comp", "");
      });

      // 替换内容
      str = tempEl.html;
    }
  }

  return str;
};

// 生成style字符串
const getStyleStr = (options) => {
  let styleStr = "";

  if (options.bold) {
    styleStr += "font-weight: 600;";
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

  if (options.backgroundColor) {
    styleStr += `background-color: ${options.backgroundColor};`;
  }

  return styleStr;
};

const getCompPropStr = (comp) => {
  if (!comp) {
    return ``;
  }

  return ` custom-comp="${encodeURI(JSON.stringify(comp))}"`;
};

const hasOptsData = (options) => {
  return (
    options.bold ||
    options.underline ||
    options.italic ||
    options.color ||
    options.lineThrough ||
    options.backgroundColor ||
    !!options.comp
  );
};

const equalOptions = (a, b) => {
  return (
    a.bold === b.bold &&
    a.underline === b.underline &&
    a.italic === b.italic &&
    a.color === b.color &&
    a.lineThrough === b.lineThrough &&
    a.backgroundColor === b.backgroundColor &&
    JSON.stringify(a.comp) === JSON.stringify(b.comp)
  );
};
