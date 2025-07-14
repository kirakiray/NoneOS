import { getSelectionLetterData } from "../util/range.js";

let mousedownStartBlock = null;

// 修改选中文本颜色背景加粗等的初始化操作
export const initTextRange = (lumipage) => {
  lumipage.on(
    "mousedown",
    (lumipage._selectionMousedownFunc = (e) => {
      const [lumiBlock] = e
        .composedPath()
        .filter((e) => e.tagName === "LUMI-BLOCK");

      if (!lumiBlock) {
        return;
      }

      // 数据设置到textpanel上
      const textPanel = lumipage.shadow.$("lumi-text-panel");

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

      // 数据设置到textpanel上
      const textPanel = lumipage.shadow.$("lumi-text-panel");

      if (!textPanel) {
        console.error("lumi-text-panel not found");
        return;
      }

      textPanel._selectedData = selectionData;
      textPanel.open = true;

      const originEvent = e;

      Object.assign(textPanel.style, {
        position: "fixed",
        left: `${originEvent.clientX}px`,
        top: `${originEvent.clientY - 50}px`,
      });

      // // 如果超出了屏幕边, 改为靠右
      const width = parseInt(textPanel.css.width);

      console.log("panelwidth: ", width);

      const selfRect = lumipage.ele.getBoundingClientRect();

      if (width + originEvent.clientX > selfRect.width + selfRect.left) {
        textPanel.style.left = selfRect.width - width + selfRect.left + "px";
      }

      console.log("selectionData: ", selectionData);
    })
  );
};
export const revokeTextRange = (lumipage) => {
  lumipage.off("mousedown", lumipage._selectionMousedownFunc);
  lumipage.off("mouseup", lumipage._selectionMouseupFunc);
};
