import { getLumiBlock } from "../util/lumi-util.js";

let mousedownStartBlock = null;

export const initMultiSelect = (lumipage) => {
  lumipage.on(
    "mousedown",
    (lumipage._multiSelectMousedownFunc = (e) => {
      const lumiBlock = getLumiBlock(e);

      if (!lumiBlock) {
        return;
      }

      lumipage.forEach((e) => {
        e.selected = null;
      });

      mousedownStartBlock = lumiBlock; // 记录鼠标按下的block
    })
  );

  lumipage.on(
    "mouseover",
    (lumipage._multiSelectMouseoverFunc = (e) => {
      const lumiBlock = getLumiBlock(e);

      if (!lumiBlock || !mousedownStartBlock) {
        return;
      }

      const { startIndex, endIndex } = getStartAndEnd(lumiBlock, lumipage);

      // 打上选中的标记
      lumipage.forEach((e, i) => {
        if (i >= startIndex && i <= endIndex) {
          e.selected = true;
        } else {
          e.selected = null;
        }
      });

      if (startIndex === endIndex) {
        $(lumiBlock).selected = null;
      }
    })
  );

  lumipage.on(
    "mouseup",
    (lumipage._multiSelectMouseupFunc = (e, selectedOptions) => {
      let lumiBlock = null;
      let startIndex, endIndex;
      if (!selectedOptions) {
        lumiBlock = getLumiBlock(e);

        if (!lumiBlock || !mousedownStartBlock) {
          return;
        }

        ({ startIndex, endIndex } = getStartAndEnd(lumiBlock, lumipage));
      } else {
        lumiBlock = selectedOptions.lumiBlock;
        startIndex = selectedOptions.startIndex;
        endIndex = selectedOptions.endIndex;
      }

      if (startIndex === endIndex) {
        mousedownStartBlock = null;
        return;
      }

      // 选中的block
      const selectedBlocks = lumipage.slice(startIndex, endIndex + 1);

      const multiPanel = lumipage.shadow.$("lumi-multi-panel");

      if (!multiPanel) {
        console.error("lumi-multi-panel not found");
        return;
      }

      lumipage._selecteds = selectedBlocks;
      multiPanel.open = true; // 打开

      const originEvent = e;

      multiPanel.multiPanelStyle = {
        left: `${originEvent.clientX}px`,
        top: `${originEvent.clientY}px`,
      };

      // // 如果超出了屏幕边, 改为靠右
      const width = parseInt(multiPanel.panel.css.width);

      console.log("panelwidth: ", width);

      const selfRect = lumipage.ele.getBoundingClientRect();

      if (width + originEvent.clientX > selfRect.width + selfRect.left) {
        multiPanel.multiPanelStyle.left =
          selfRect.width - width + selfRect.left + "px";
      }

      multiPanel.one("close", () => {
        lumipage.forEach((e) => {
          e.selected = null;
        });
        lumipage._selecteds = [];
      });

      // 取消原来选中的范围
      window.getSelection().removeAllRanges();

      console.log("selectedBlocks: ", selectedBlocks);

      mousedownStartBlock = null;
    })
  );
};

const getStartAndEnd = (lumiBlock, lumipage) => {
  const targetChild = Array.from(lumipage.ele.children);
  let startIndex = targetChild.indexOf(mousedownStartBlock);
  let endIndex = targetChild.indexOf(lumiBlock);

  return {
    startIndex: startIndex > endIndex ? endIndex : startIndex,
    endIndex: startIndex > endIndex ? startIndex : endIndex,
  };
};

export const revokeMultiSelect = (lumipage) => {
  lumipage.off("mousedown", lumipage._multiSelectMousedownFunc);
  lumipage.off("mouseover", lumipage._multiSelectMouseoverFunc);
  lumipage.off("mouseup", lumipage._multiSelectMouseupFunc);
};
