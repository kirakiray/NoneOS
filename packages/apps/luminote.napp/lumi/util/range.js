const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

const isFirefox = navigator.userAgent.indexOf("Firefox") > -1;

// 获取返回内的数据
export const getSelectionLetterData = (root, editorEl) => {
  if (!root || isFirefox) {
    root = document;
  }

  const selection = root.getSelection();

  if (selection.type === "None") {
    return {};
  }

  const range = selection.getRangeAt(0);

  if (!editorEl) {
    let target = range.startContainer;
    while (!target.matches || !target.matches("[inputer-content]")) {
      target = target.parentNode;

      if (!target) {
        break;
      }
    }
    editorEl = target;
  }

  // 转为字母数据
  const letterData = elementToLetterData(editorEl);

  if (!letterData.length) {
    // return null;
    return {
      startOffset: 0,
      endOffset: 0,
      letterData: [],
      selectionRangeLetter: [],
    };
  }

  let startOffset = getRealOffset(
    editorEl,
    range.startContainer,
    range.startOffset
  );

  let endOffset = getRealOffset(editorEl, range.endContainer, range.endOffset);

  // 给目标范围内的字符修正信息
  const selectionRangeLetter = letterData.slice(startOffset, endOffset);

  return {
    startOffset,
    endOffset,
    letterData,
    selectionRangeLetter,
  };
};

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

  if (!nodes.length) {
    return {
      container: root,
      offset: 0,
    };
  }

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
export const elementToLetterData = (node, options = {}) => {
  if (node instanceof Comment) {
    return [];
  }

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

  let selfOptions = {};

  if (node.style) {
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
    let color = selfStyle.color;
    let backgroundColor = selfStyle.backgroundColor;
    const comp = node.getAttribute("custom-comp");

    if (color && !color.includes("var(")) {
      // 转换回对应的主题色变量，看看是否相等；没有对应主题色则清空，有就替换。
      const themeStr = getThemeColorName(color);

      if (themeStr) {
        color = `var(${themeStr})`;
      } else {
        color = "";
      }
    }

    if (backgroundColor && !backgroundColor.includes("var(")) {
      // 转换回对应的主题色变量，看看是否相等；没有对应主题色则清空，有就替换。
      const themeStr = getThemeColorName(backgroundColor);

      if (themeStr) {
        backgroundColor = `var(${themeStr})`;
      } else {
        backgroundColor = "";
      }
    }

    // 看看是不是内部的颜色

    selfOptions = {
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
  }

  let arr = [];

  if (node.childNodes) {
    for (let e of Array.from(node.childNodes)) {
      arr.push(...elementToLetterData(e, selfOptions));
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

let bodyThemeColor = null;
const getThemeColorName = (color) => {
  if (bodyThemeColor) {
    return bodyThemeColor.get(color);
  }

  bodyThemeColor = new Map();

  // 获取主题色的值
  const bodyCompStyle = document.body.computedStyleMap();
  [
    "--md-sys-color-primary",
    "--md-sys-color-success",
    "--md-sys-color-error",
    "--md-sys-color-normal",
    "--md-sys-color-primary-container",
    "--md-sys-color-success-container",
    "--md-sys-color-error-container",
    "--md-sys-color-normal-container",
  ].forEach((key) => {
    const value = hexToRgb(bodyCompStyle.get(key)[0]);
    bodyThemeColor.set(value, key);
  });

  return bodyThemeColor.get(color);
};

function hexToRgb(hex) {
  // 移除可能的 #
  hex = hex.replace(/^#/, "");

  // 处理简写形式如 #fff -> #ffffff
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }

  // 解析 R, G, B 值
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `rgb(${r}, ${g}, ${b})`;
}

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

// 选中范围
export const setSelection = ({ startContainer, endContainer, start, end }) => {
  const range = document.createRange();
  range.setStart(startContainer, start);
  range.setEnd(endContainer, end);

  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
};
