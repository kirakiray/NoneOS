let mousedownStartBlock = null;

export const initMultiSelect = (lumipage) => {
  lumipage.on("mousedown", (e) => {
    const [lumiBlock] = e
      .composedPath()
      .filter((e) => e.tagName === "LUMI-BLOCK");

    if (!lumiBlock) {
      return;
    }

    mousedownStartBlock = lumiBlock; // 记录鼠标按下的block
  });

  lumipage.on("mouseover", (e) => {
    const [lumiBlock] = e
      .composedPath()
      .filter((e) => e.tagName === "LUMI-BLOCK");

    if (!lumiBlock || !mousedownStartBlock) {
      return;
    }

    const targetChild = Array.from(lumipage.ele.children);
    const startIndex = targetChild.indexOf(mousedownStartBlock);
    const endIndex = targetChild.indexOf(lumiBlock);

    // 打上选中的标记
    lumipage.forEach((e, i) => {
      if (i >= startIndex && i <= endIndex) {
        e.selected = true;
      } else {
        e.selected = null;
      }
    });
  });

  lumipage.on("mouseup", (e) => {
    const [lumiBlock] = e
      .composedPath()
      .filter((e) => e.tagName === "LUMI-BLOCK");

    if (!lumiBlock || !mousedownStartBlock) {
      return;
    }

    const targetChild = Array.from(lumipage.ele.children);
    const startIndex = targetChild.indexOf(mousedownStartBlock);
    const endIndex = targetChild.indexOf(lumiBlock);

    // 选中的block
    const selectedBlocks = lumipage.slice(startIndex, endIndex + 1);

    mousedownStartBlock = null;
  });
};

export const revokeMultiSelect = (lumipage) => {
  debugger;
};
