export const initDrag = (lumipage) => {
  let dargStartBlock;

  lumipage.on(
    "drag-block-start",
    (lumipage._dragStartFunc = (e) => {
      e.stopPropagation();

      dargStartBlock = $(e.target);
      dargStartBlock.attr("draggable", "true");
    })
  );

  // 必须禁用，不然会导致drop无效
  lumipage.on("dragover", (e) => e.preventDefault());

  let oldDragEnterBlock;
  lumipage.on("dragenter", (e) => {
    e.preventDefault();

    if (!dargStartBlock) {
      return;
    }

    // 获取对应的 block元素
    const [lumiBlock] = e
      .composedPath()
      .filter((e) => e.tagName === "LUMI-BLOCK");

    if (!lumiBlock) {
      return;
    }

    if (oldDragEnterBlock) {
      // 去掉之前的标记
      oldDragEnterBlock.dragovering = false;
    }

    const currentDragEnterBlock = $(lumiBlock);

    // 如果是前一个元素，代表没有位移，也不需要标记
    if (lumiBlock.nextSibling && lumiBlock.nextSibling === dargStartBlock.ele) {
      return;
    }

    if (dargStartBlock && lumiBlock === dargStartBlock.ele) {
      // 移动到自身上
      currentDragEnterBlock.dragovering = false;
      return;
    }

    currentDragEnterBlock.dragovering = true; // 标记为悬停

    oldDragEnterBlock = currentDragEnterBlock;
  });

  lumipage.on("drop", (e) => {
    // 覆盖到对应块上
    if (!dargStartBlock) {
      return;
    }

    e.stopPropagation();

    // 获取对应的 block元素
    const [lumiBlock] = e
      .composedPath()
      .filter((e) => e.tagName === "LUMI-BLOCK");

    if (dargStartBlock && lumiBlock === dargStartBlock.ele) {
      return;
    }
    // 如果是前一个元素，代表没有位移，也不需要标记
    if (lumiBlock.nextSibling && lumiBlock.nextSibling === dargStartBlock.ele) {
      return;
    }

    const currentDragEnterBlock = $(lumiBlock);

    // 位移数据
    const currentIndex = lumipage.itemData.content.indexOf(
      currentDragEnterBlock.itemData
    );
    const startIndex = lumipage.itemData.content.indexOf(
      dargStartBlock.itemData
    );

    if (currentIndex === -1 || startIndex === -1) {
      return;
    }

    const [targetData] = lumipage.itemData.content.splice(startIndex, 1);
    lumipage.itemData.content.splice(currentIndex, 0, targetData);
  });

  lumipage.on("dragend", () => {
    if (oldDragEnterBlock) {
      oldDragEnterBlock.dragovering = false;
      oldDragEnterBlock = null;
    }
    if (dargStartBlock) {
      dargStartBlock.attr("draggable", null);
    }
  });
};

export const revokeDrag = (lumipage) => {
  lumipage.off("drag-block-start", lumipage._dragStartFunc);
};
