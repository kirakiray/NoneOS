import {
  getSelectionLetterData,
  getContainerAndOffset,
  setSelection,
} from "../util/range.js";

let mousedownStartBlock = null;

// 修改选中文本颜色背景加粗等的初始化操作
export const initTextRange = (lumipage) => {
  // 数据设置到textpanel上
  const textPanel = lumipage.shadow.$("lumi-text-panel");

  textPanel.on("update-value", (e) => {
    e.stopPropagation();
    const { data } = e;
    const { value, startOffset, endOffset } = data;
    const { _targetBlock } = textPanel;

    _targetBlock.$("[inputer-content]").html = value;
    _targetBlock.itemData.value = value;

    // 重新选择范围
    const { container: startContainer, offset: start } = getContainerAndOffset(
      _targetBlock[0].ele,
      startOffset
    );
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

    textPanel.refreshBtnState();
  });

  lumipage.on(
    "mousedown",
    (lumipage._selectionMousedownFunc = (e) => {
      const [lumiBlock] = e
        .composedPath()
        .filter((e) => e.tagName === "LUMI-BLOCK");

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

  lumipage.on(
    "mouseup",
    (lumipage._selectionMouseupFunc = async (e) => {
      const [lumiBlock] = e
        .composedPath()
        .filter((e) => e.tagName === "LUMI-BLOCK");

      if (lumiBlock !== mousedownStartBlock) {
        // 不是同一个block, 不处理
        mousedownStartBlock = null;
        return;
      }
      textPanel._targetBlock = $(mousedownStartBlock);
      mousedownStartBlock = null;

      await new Promise((resolve) => setTimeout(resolve, 10)); // 防止错误选区聚焦

      // 查看选择的文本
      const selectionData = await getSelectionLetterData(
        lumipage.ele.getRootNode()
      );

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
};
export const revokeTextRange = (lumipage) => {
  lumipage.off("mousedown", lumipage._selectionMousedownFunc);
  lumipage.off("mouseup", lumipage._selectionMouseupFunc);
};
