import { getLumiBlock, copySelectedBlock } from "../util/lumi-util.js";
import {
  getSelectionLetterData,
  letterDataToElement,
  elementToLetterData,
} from "../util/range.js";

export const initTextInput = (lumipage) => {
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

      if (e.key === "/" && lumiBlock.itemData.value === "") {
        // 如果是在组件第一个字符按下，则弹出组件选择菜单
        debugger;
      }

      if (e.key === "c" && (e.metaKey || e.ctrlKey)) {
        // 复制
        e.preventDefault();

        if (lumipage._selecteds) {
          copySelectedBlock(lumipage);
          return;
        }

        navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([lumiBlock.htmlContent], {
              type: "text/html",
            }),
            "text/plain": new Blob([lumiBlock.textContent], {
              type: "text/plain",
            }),
            // "text/markdown": new Blob([lumiBlock.mdContent], {
            //   type: "text/markdown",
            // }),
          }),
        ]);
        return;
      }

      if (e.key === "Backspace") {
        // 在没有内容时按了返回，等于清空内容
        handleBackspace(lumipage, lumiBlock);
        return;
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

          while (next.itemData.type === "article") {
            next = next.next;
            if (!next) {
              break;
            }
          }

          // 向下聚焦
          if (next) {
            next.focus("start");
            return;
          }
        }
      }

      if (e.key === "Enter" && !e.shiftKey) {
        // 会车，直接在下面新增一个
        e.preventDefault();

        handleEnter(lumipage, lumiBlock);
      }
    })
  );
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
  lumiBlock.on(
    "blur",
    (blurFunc = () => {
      lumiBlock.__beforeSelectAll = null;
      lumiBlock.off("blur", blurFunc);
    })
  );

  lumiBlock.__beforeSelectAll = true;
};

// 按了删除键
const handleBackspace = async (lumipage, lumiBlock) => {
  const { index } = lumiBlock;

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

  const selection = window.getSelection();
  const range = selection.getRangeAt(0);

  // 回车且内容在最开始的位置，则把内容带到上一段
  if (range.startOffset === 0 && range.endOffset === 0) {
    const targetIndex = lumipage.itemData.content.indexOf(lumiBlock.itemData);

    if (targetIndex > 0) {
      const prev = lumiBlock.prev;
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
const handleEnter = async (lumipage, lumiBlock) => {
  const { index } = lumiBlock;
  const finnalIndex = index + 1;

  // 获取选中的焦点
  const selectionRangeData = await getSelectionLetterData(document);

  // 截取焦点后的内容
  const afterLetterData = selectionRangeData.letterData.slice(
    selectionRangeData.startOffset
  );

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
      type: "paragraph",
      value: afterContent,
    });
  } else {
    // 最末尾添加
    lumipage.itemData.content.splice(finnalIndex, 0, {
      type: "paragraph",
      value: "",
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
