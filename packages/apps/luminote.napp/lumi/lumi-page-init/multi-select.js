let mousedownStartBlock = null;

export const initMultiSelect = (lumipage) => {
  lumipage.on("mousedown", (e) => {
    const [lumiBlock] = e
      .composedPath()
      .filter((e) => e.tagName === "LUMI-BLOCK");

    if (!lumiBlock) {
      return;
    }

    lumipage.forEach((e) => {
      e.selected = null;
    });

    mousedownStartBlock = lumiBlock; // 记录鼠标按下的block
  });

  lumipage.on("mouseover", (e) => {
    const [lumiBlock] = e
      .composedPath()
      .filter((e) => e.tagName === "LUMI-BLOCK");

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
  });

  lumipage.on("mouseup", (e) => {
    const [lumiBlock] = e
      .composedPath()
      .filter((e) => e.tagName === "LUMI-BLOCK");

    if (!lumiBlock || !mousedownStartBlock) {
      return;
    }

    const { startIndex, endIndex } = getStartAndEnd(lumiBlock, lumipage);

    // 选中的block
    const selectedBlocks = lumipage.slice(startIndex, endIndex + 1);

    mousedownStartBlock = null;
  });
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
  debugger;
};
