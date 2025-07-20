import {
  getLumiBlock,
  copySelectedBlock,
  deleteSelectedBlock,
} from "../util/lumi-util.js";
import {
  getSelectionLetterData,
  letterDataToElement,
  elementToLetterData,
} from "../util/range.js";

import { blockComps } from "../block/config.js";

import { inlineComps } from "../inline/config.js";

import purify from "/packages/libs/purify.es.mjs";

purify.setConfig({
  RETURN_TRUSTED_TYPE: false,
  FORCE_BODY: true,
  ALLOWED_TAGS: [
    "span",
    "b",
    "i",
    "em",
    "strong",
    "a",
    "p",
    "code",
    ...inlineComps.map((e) => e.tag),
    ...blockComps.map((e) => e.tag),
  ], // 允许的标签
});

export const initTextInput = (lumipage) => {
  const commandPanel = lumipage.shadow.$("lumi-command-panel");

  lumipage.on("mousewheel", (e) => {
    if (commandPanel.open === "on") {
      commandPanel.removeBind();
    }
  });

  lumipage.on(
    "keydown",
    (lumipage._inputKeydownFunc = async (e) => {
      if (!e.target.matches("[inputer-content]")) {
        // 非默认编辑元素则不处理
        return;
      }

      let lumiBlock = getLumiBlock(e);

      if (!lumiBlock) {
        return;
      }

      lumiBlock = $(lumiBlock);

      const selectionData = getSelectionLetterData();

      const result = handleMatchComponent(e, {
        lumiBlock,
        selectionData,
      });

      if (result === false) {
        return;
      }

      // 看看是否先从选项上出发keydown
      const { componentOptions } = lumiBlock;
      if (componentOptions._keydown) {
        const result = componentOptions._keydown(e, {
          lumiBlock,
          lumipage,
        });
        if (result === false) {
          return;
        }
      }

      if (e.key === "/" && selectionData.startOffset < 2) {
        // 如果是在组件第一个字符按下，则弹出组件选择菜单
        commandPanel.init(e, {
          lumiBlock,
          lumipage,
        });
        return;
      } else {
        commandPanel.removeBind();
      }

      if (e.key === "c" && (e.metaKey || e.ctrlKey)) {
        // 复制
        e.preventDefault();

        if (lumipage._selecteds?.length) {
          copySelectedBlock(lumipage);
          return;
        }

        const { selectionRangeLetter } = selectionData;

        e.preventDefault();

        if (!selectionRangeLetter.length) {
          navigator.clipboard.write([
            new ClipboardItem({
              "text/plain": new Blob([lumiBlock.textContent], {
                type: "text/plain",
              }),
              "text/html": new Blob([lumiBlock.htmlContent], {
                type: "text/html",
              }),
              // "text/markdown": new Blob([lumiBlock.mdContent], {
              //   type: "text/markdown",
              // }),
            }),
          ]);
        } else {
          const html = await letterDataToElement(selectionRangeLetter);
          const temp = $(`<template>${html}</template>`);

          navigator.clipboard.write([
            new ClipboardItem({
              "text/html": new Blob([html], {
                type: "text/html",
              }),
              "text/plain": new Blob([temp.ele.content.textContent], {
                type: "text/plain",
              }),
            }),
          ]);
        }

        return;
      }

      if (e.key === "]" && lumipage._selecteds?.length) {
        // 多选往后
        selectedsTabPlus(lumipage, e);
        return;
      }

      if (e.key === "[" && lumipage._selecteds?.length) {
        // 多选往后
        selectedsTabPlus(lumipage, e, -1);
        return;
      }

      if (e.key === "Tab") {
        // 增加间距
        e.preventDefault();

        // 多选的话，全部加tab
        if (lumipage._selecteds?.length) {
          selectedsTabPlus(lumipage, e);
          return;
        }

        // 不能比前面那个大1
        let prevTab = lumiBlock.prev ? lumiBlock.prev.itemData.tab || 0 : 0;
        if (!lumiBlock.itemData.tab || lumiBlock.itemData.tab < 0) {
          lumiBlock.itemData.tab = 0;
        }
        lumiBlock.itemData.tab++;
        if (lumiBlock.itemData.tab > prevTab + 1) {
          lumiBlock.itemData.tab = prevTab + 1;
        }
        return;
      }

      if (e.key === "Backspace") {
        if (lumipage._selecteds?.length) {
          deleteSelectedBlock(lumipage);

          // 关闭弹窗
          lumipage.shadow.$("lumi-multi-panel").open = false;
          return;
        }

        // 在没有内容时按了返回，等于清空内容
        handleBackspace(lumipage, { lumiBlock, selectionData });
        return;
      }

      if (e.key === "Enter" && !e.shiftKey) {
        // 会车，直接在下面新增一个
        e.preventDefault();

        handleEnter(lumipage, { lumiBlock, selectionData });
      }

      if (e.key === "a" && (e.metaKey || e.ctrlKey)) {
        handleSelectAll(lumipage, lumiBlock, e);
        return;
      }

      if (e.key === "ArrowUp") {
        const { startOffset, endOffset } = await getSelectionLetterData(
          lumiBlock.ele.getRootNode()
        );

        if (startOffset === 0) {
          let prev = lumiBlock.prev;

          while (prev.itemData.type === "article") {
            prev = prev.prev;
            if (!prev) {
              break;
            }
          }

          // 向上聚焦
          if (prev) {
            prev.focus("end");
            return;
          }
        }
      }

      if (e.key === "ArrowDown") {
        const { startOffset, endOffset } = await getSelectionLetterData(
          lumiBlock.ele.getRootNode()
        );

        if (endOffset === lumiBlock.text.length) {
          let next = lumiBlock.next;

          while (next && next.itemData.type === "article") {
            next = next.next;
          }

          // 向下聚焦
          if (next) {
            next.focus("start");
            return;
          }
        }
      }
    })
  );

  lumipage.on("paste", async (e) => {
    let lumiBlock = getLumiBlock(e);

    const [inputerContent] = e
      .composedPath()
      .filter((e2) => e2.matches && e2.matches("[inputer-content]"));

    if (!lumiBlock || !inputerContent) {
      return;
    }

    lumiBlock = $(lumiBlock);

    // 获取粘贴的内容
    const clipboardData = e.clipboardData;
    let pastedHtml = clipboardData.getData("text/html");
    {
      // 还原被净化的属性值
      const originalTemplate = $(`<template>${pastedHtml}</template>`);
      // 净化html
      pastedHtml = purify.sanitize(pastedHtml);
      const sanitizedTemplate = $(`<template>${pastedHtml}</template>`);

      const originalCustomElements = originalTemplate.all(
        inlineComps.map((component) => component.tag).join(",")
      );
      const sanitizedCustomElements = sanitizedTemplate.all(
        inlineComps.map((component) => component.tag).join(",")
      );

      originalCustomElements.forEach((originalElement, index) => {
        const sanitizedElement = sanitizedCustomElements[index];
        for (let attribute of originalElement.ele.attributes) {
          sanitizedElement.attr(attribute.name, attribute.value);
        }
      });

      pastedHtml = sanitizedTemplate.html;
    }

    const pushContents = (contents) => {
      const parentContent = lumipage.itemData.content;

      // 在当前的前面添加对应的数据
      const index = parentContent.indexOf(lumiBlock.itemData);

      if (index > -1) {
        parentContent.splice(index, 0, ...contents);
      }
    };

    if (pastedHtml) {
      const temp = $(`<template>${pastedHtml}</template>`).ele;

      const contents = [];

      // const hasP = temp.content.querySelector("p");
      // const hasTitle =
      //   temp.content.querySelector("h1") ||
      //   temp.content.querySelector("h2") ||
      //   temp.content.querySelector("h3") ||
      //   temp.content.querySelector("h4") ||
      //   temp.content.querySelector("h5");

      // 直接单标签开头
      if (/^</.test(pastedHtml.trim())) {
        for (let item of temp.content.children) {
          if (item.innerHTML) {
            const reContent = await elementToLetterData(item);

            const tag = item.tagName.toLowerCase();

            if (tag === "p" || tag === "h2" || tag === "h3" || tag === "h4") {
              const type = tag === "p" ? "paragraph" : tag;

              contents.push({
                type,
                value: await letterDataToElement(reContent),
              });
            } else if (tag === "code") {
              contents.push({
                type: "lumi-code",
                value: item.innerHTML,
              });
            } else {
              const tag = item.tagName.toLowerCase();

              if (blockComps.find((e) => e.tag === tag)) {
                const attrs = {};

                for (let e of item.attributes) {
                  attrs[e.name] = e.value;
                }

                contents.push({
                  type: tag,
                  attrs,
                  value: await letterDataToElement(reContent),
                });
              } else {
                // 不明类型全部填充为段落
                contents.push({
                  type: "paragraph",
                  value: await letterDataToElement(reContent),
                });
              }
            }
          }
        }

        e.preventDefault();
        pushContents(contents);
      } else {
        // const selectionRangeData = selectionData;
        // // 直接粘贴的片段
        // const reContent = await elementToLetterData(temp.content);
        // debugger;
        // console.log("paste");
        // contents.push({
        //   type: "paragraph",
        //   value: await letterDataToElement(reContent),
        // });
      }

      return;
    }
    {
      const contents = [];

      let pastedText = clipboardData.getData("text/plain"); //
      if (!pastedText) {
        pastedText = await navigator.clipboard.readText();
      }

      if (!pastedText) {
        console.log("粘贴失败");
        return;
      }

      // 内容分段
      const lines = pastedText.split("\n");

      lines
        .filter((e) => !!e)
        .forEach((e) => {
          // 净化html
          const value = purify.sanitize(e.trim());

          contents.push({
            type: "paragraph",
            value,
          });
        });

      pushContents(contents);
    }
  });
};

const selectedsTabPlus = (lumipage, event, tabCount = 1) => {
  event.preventDefault();

  // 确保第一个已经是最大的tabid
  const selectFirstTab = lumipage._selecteds[0].itemData.tab || 0;
  const prevTab = lumipage._selecteds[0].prev?.itemData.tab || 0;

  if (tabCount > 0 && selectFirstTab > prevTab) {
    // 第一个超过就不执行了
    return;
  }

  lumipage._selecteds.forEach((e) => {
    let finalTab = (e.itemData.tab || 0) + tabCount;
    finalTab <= 0 && (finalTab = 0);
    e.itemData.tab = finalTab;
  });
};

// 匹配组件
const handleMatchComponent = (e, { lumiBlock, selectionData }) => {
  // 进入组件状态需满足以下条件：
  // * 输入焦点位于内容起始位置
  // * 当前内容匹配组件关键字
  // * 按下空格键
  if (e.key == " " && selectionData.startOffset < 4) {
    const keyStr = lumiBlock.itemData.value.slice(0, selectionData.startOffset);

    if (keyStr.startsWith("#")) {
      e.preventDefault();
      switch (keyStr) {
        case "#":
          lumiBlock.itemData.type = "h2";
          break;
        case "##":
          lumiBlock.itemData.type = "h3";
          break;
        case "###":
          lumiBlock.itemData.type = "h4";
          break;
      }
      lumiBlock.itemData.value = lumiBlock.itemData.value.replace(keyStr, "");
      return false;
    }

    let compData;
    const targetComp = blockComps.find((e) => {
      if (e._getMatchKey) {
        const mapObj = new Map(e._getMatchKey());
        compData = mapObj.get(keyStr);

        return !!compData;
      }
    });

    if (compData && targetComp) {
      e.preventDefault();
      lumiBlock.itemData.value = lumiBlock.itemData.value.replace(keyStr, "");
      lumiBlock.itemData.type = targetComp.tag;

      setTimeout(() => {
        // 合并数据
        Object.assign(lumiBlock.shadow.$("lumi-fake").innerComponent, compData);
      });
      return false;
    }
  }
};

const handleSelectAll = (lumipage, lumiBlock, originEvent) => {
  if (lumiBlock.__beforeSelectAll) {
    // 获取 lumiBlock 的定位
    const { top, left, width } = lumiBlock.ele.getBoundingClientRect();

    // 触发选中全部元素的方法
    lumipage._multiSelectMouseupFunc &&
      lumipage._multiSelectMouseupFunc(
        {
          clientX: left + width / 2,
          clientY: top,
        },
        {
          lumiBlock,
          startIndex: 0,
          endIndex: lumiBlock.siblings.length - 1,
        }
      );

    originEvent.preventDefault();

    lumipage.forEach((e) => (e.selected = true));

    window.getSelection().removeAllRanges();
    lumiBlock.__beforeSelectAll = null;
    return;
  }

  let blurFunc;
  lumiBlock[0].on(
    "blur",
    (blurFunc = () => {
      lumiBlock.__beforeSelectAll = null;
      lumiBlock.off("blur", blurFunc);
    })
  );

  lumiBlock.__beforeSelectAll = true;
};

// 按了删除键
const handleBackspace = async (
  lumipage,
  { lumiBlock, selectionData: selectionRangeData }
) => {
  const { index } = lumiBlock;

  if (
    selectionRangeData.startOffset === 0 &&
    selectionRangeData.endOffset === 0 &&
    lumiBlock.componentOptions.tag
  ) {
    // 如果当前是block组件，则将类型改为段落
    lumiBlock.itemData.type = "paragraph";
    return;
  }

  // 查看是否有tabLeft，有的话进行递进
  if (
    lumiBlock.itemData.tab &&
    selectionRangeData.startOffset === 0 &&
    selectionRangeData.endOffset === 0
  ) {
    // 将子项目也递进
    lumiBlock.subItems.forEach((e) => {
      e.itemData.tab--;
    });

    lumiBlock.itemData.tab = parseInt(lumiBlock.itemData.tab) - 1;
    return;
  }

  if (!lumiBlock.itemData.value.trim()) {
    // 没有内容的块直接删除
    lumipage.itemData.content.splice(index, 1);

    setTimeout(
      () => {
        let prevBlock = lumipage[index - 1];

        while (prevBlock && prevBlock.data.type === "article") {
          prevBlock = prevBlock.prev;
        }

        // 文本焦点放在最后
        prevBlock && prevBlock.focus();
      },
      isSafari ? 60 : 1
    );
  }

  // 回车且内容在最开始的位置，则把内容带到上一段
  if (
    selectionRangeData.startOffset === 0 &&
    selectionRangeData.endOffset === 0
  ) {
    let prev = lumiBlock.prev;

    while (prev.itemData.type === "article") {
      prev = prev.prev;
      if (!prev) {
        prev = null;
        break;
      }
    }

    if (prev) {
      // 查看是否可以和前面合并
      const { useContenteditable } = prev;

      if (!useContenteditable) {
        // 前一个元素不使用 contenteditable，不能向前合并
        return;
      }
    }

    const targetIndex = lumipage.itemData.content.indexOf(lumiBlock.itemData);

    if (targetIndex > 0) {
      // 和前一个数据合并
      const currentLetterData = await elementToLetterData(
        lumiBlock.$("[inputer-content]").ele
      );
      const prevLetterData = await elementToLetterData(
        prev.$("[inputer-content]").ele
      );

      const newLetterData = [...prevLetterData, ...currentLetterData];
      const newContent = await letterDataToElement(newLetterData);

      // 更新前一个数据
      prev.itemData.value = newContent;

      // 删除当前的数据
      lumipage.itemData.content.splice(targetIndex, 1);

      // 修复焦点
      setTimeout(
        () => {
          prev.focus(prevLetterData.length);
        },
        isSafari ? 60 : 1
      );
    }
    return;
  }
};

// 按了回车
const handleEnter = async (
  lumipage,
  { lumiBlock, selectionData: selectionRangeData }
) => {
  const { index } = lumiBlock;
  const finnalIndex = index + 1;

  // 截取焦点后的内容
  const afterLetterData = selectionRangeData.letterData.slice(
    selectionRangeData.startOffset
  );

  const tab = lumiBlock.itemData.tab;

  const { keepEnterNext, tag } = lumiBlock.componentOptions;

  if (afterLetterData.length) {
    const beforeLetterData = selectionRangeData.letterData.slice(
      0,
      selectionRangeData.startOffset
    );

    const beforeContent = await letterDataToElement(beforeLetterData);
    const afterContent = await letterDataToElement(afterLetterData);

    // 获取对应选中的组件
    const selectedComponent = lumipage[index];

    // 更新回车后的内容
    selectedComponent.itemData.value = beforeContent;

    // 从焦点位置将内容带下去
    lumipage.itemData.content.splice(finnalIndex, 0, {
      type: keepEnterNext ? tag : "paragraph",
      value: afterContent,
      tab,
    });
  } else {
    // 最末尾添加
    lumipage.itemData.content.splice(finnalIndex, 0, {
      type: keepEnterNext ? tag : "paragraph",
      value: "",
      tab,
    });
  }

  setTimeout(
    () => {
      lumipage[finnalIndex].focus("start");
    },
    isSafari ? 60 : 1
  );
};

export const revokeTextInput = (lumipage) => {
  lumipage.off("keydown", lumipage._inputKeydownFunc);
};

const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
