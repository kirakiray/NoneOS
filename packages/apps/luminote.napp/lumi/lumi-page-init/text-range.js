import {
  getSelectionLetterData,
  getContainerAndOffset,
  setSelection,
} from "../util/range.js";

import { getLumiBlock } from "../util/lumi-util.js";

let mousedownStartBlock = null;

// 修改选中文本颜色背景加粗等的初始化操作
export const initTextRange = (lumipage) => {
  // 数据设置到textpanel上
  const textPanel = lumipage.shadow.$("lumi-text-panel");
  const inlineCompPanel = lumipage.shadow.$("lumi-inline-comp-panel");

  lumipage.on("drag-block-start", () => {
    textPanel.open = false;
  });

  textPanel.on("update-value", (e) => {
    e.stopPropagation();
    const { data } = e;
    const { value, startOffset, endOffset } = data;
    const { _targetBlock } = textPanel;

    _targetBlock.$("[inputer-content]").html = value;
    _targetBlock.itemData.value = value;

    // 兼容safari未提前渲染的问题
    $.nextTick(() => {
      // 重新选择范围
      const { container: startContainer, offset: start } =
        getContainerAndOffset(_targetBlock[0].ele, startOffset);
      const { container: endContainer, offset: end } = getContainerAndOffset(
        _targetBlock[0].ele,
        endOffset
      );

      // 创建范围并设置光标位置
      setSelection({
        startContainer,
        start,
        endContainer,
        end,
      });

      setTimeout(() => {
        textPanel.refreshBtnState();
      }, 10);
    });
  });

  lumipage.on(
    "mousedown",
    (lumipage._selectionMousedownFunc = (e) => {
      const lumiBlock = getLumiBlock(e);

      if (!lumiBlock) {
        return;
      }

      if (!textPanel) {
        console.error("lumi-text-panel not found");
        return;
      }

      textPanel.open = false;

      mousedownStartBlock = lumiBlock; // 记录鼠标按下的block
    })
  );

  lumipage.on("mousewheel", () => {
    textPanel.open = false;
    mousedownStartBlock = null;
  });

  lumipage.on(
    "mouseup",
    (lumipage._selectionMouseupFunc = async (e) => {
      const lumiBlock = getLumiBlock(e);

      if (lumiBlock !== mousedownStartBlock) {
        // 不是同一个block, 不处理
        mousedownStartBlock = null;
        return;
      }
      textPanel._targetBlock = $(mousedownStartBlock);
      mousedownStartBlock = null;

      await new Promise((resolve) => setTimeout(resolve, 10)); // 防止错误选区聚焦

      // 查看选择的文本
      const rootNode = lumipage.ele.getRootNode();
      if (!rootNode) {
        mousedownStartBlock = null;
        return;
      }
      let selectionData;

      try {
        selectionData = getSelectionLetterData(rootNode);
      } catch (err) {
        console.log(err);
        return;
      }

      if (selectionData.endOffset === selectionData.startOffset) {
        // 没有选择文本
        return;
      }

      textPanel.open = true;
      textPanel.refreshBtnState();

      const originEvent = e;

      // 修正位置
      Object.assign(textPanel.style, {
        position: "fixed",
        left: `${originEvent.clientX}px`,
        top: `${originEvent.clientY - 50}px`,
      });

      // 如果超出了屏幕边, 改为靠右
      const width = parseInt(textPanel.css.width);

      const selfRect = lumipage.ele.getBoundingClientRect();

      if (width + originEvent.clientX > selfRect.width + selfRect.left) {
        textPanel.style.left = selfRect.width - width + selfRect.left + "px";
      }
    })
  );

  lumipage.on("mouseover", (e) => {
    if (!e.target.matches("[custom-inline-component]")) {
      return;
    }

    inlineCompPanel.showPanel();

    // 修正位置
    Object.assign(inlineCompPanel.style, {
      position: "fixed",
      left: `${e.clientX}px`,
      top: `${e.clientY - 50}px`,
    });
  });

  lumipage.on("mouseout", (e) => {
    if (!e.target.matches("[custom-inline-component]")) {
      return;
    }

    inlineCompPanel.hidePanel();
  });
};
export const revokeTextRange = (lumipage) => {
  lumipage.off("mousedown", lumipage._selectionMousedownFunc);
  lumipage.off("mouseup", lumipage._selectionMouseupFunc);
};
