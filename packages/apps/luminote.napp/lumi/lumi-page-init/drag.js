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

    const composeds = e.composedPath();

    // 获取对应的 block元素
    const [lumiBlock] = composeds.filter((e) => e.tagName === "LUMI-BLOCK");

    if (!lumiBlock) {
      const [titleContainer] = composeds.filter(
        (e) => e.matches && e.matches("lumi-page-title")
      );

      // 判断是否title，是的话放到第一个
      if (titleContainer) {
        if (oldDragEnterBlock) {
          // 去掉之前的标记
          oldDragEnterBlock.dragovering = false;
        }

        // 位移数据
        const startIndex = lumipage.itemData.content.indexOf(
          dargStartBlock.itemData
        );

        if (startIndex <= 0) {
          return;
        }

        // 标记
        oldDragEnterBlock = $(titleContainer);
        oldDragEnterBlock.dragovering = true;
      }
      return;
    }

    if (oldDragEnterBlock) {
      // 去掉之前的标记
      oldDragEnterBlock.dragovering = false;
    }

    // 确保不是在子元素上
    const { subItems: subElItems } = dargStartBlock;
    const isSub = subElItems.some((e) => e.ele === lumiBlock);

    if (isSub) {
      return;
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

    const composeds = e.composedPath();

    // 获取对应的 block元素
    const [lumiBlock] = composeds.filter((e) => e.tagName === "LUMI-BLOCK");

    if (!lumiBlock) {
      const [titleContainer] = composeds.filter(
        (e) => e.matches && e.matches("lumi-page-title")
      );

      // 判断是否title，是的话放到第一个
      if (titleContainer) {
        // 位移数据
        const startIndex = lumipage.itemData.content.indexOf(
          dargStartBlock.itemData
        );

        if (startIndex <= 0) {
          return;
        }

        const [targetData] = lumipage.itemData.content.splice(startIndex, 1);

        lumipage.itemData.content.unshift(targetData);
      }

      return;
    }

    if (dargStartBlock && lumiBlock === dargStartBlock.ele) {
      return;
    }

    // 确保不是在子元素上
    const { subItems: subElItems } = dargStartBlock;
    const isSub = subElItems.some((e) => e.ele === lumiBlock);

    if (isSub) {
      return;
    }

    // 如果是前一个元素，代表没有位移，也不需要标记
    if (lumiBlock.nextSibling && lumiBlock.nextSibling === dargStartBlock.ele) {
      return;
    }

    const targetBlock = $(lumiBlock);

    const pageContent = lumipage.itemData.content;
    const moveItemData = (destinationItemData, sourceItemData) => {
      // 位移数据
      const destinationIndex = pageContent.indexOf(destinationItemData);
      const sourceIndex = pageContent.indexOf(sourceItemData);

      if (destinationIndex === -1 || sourceIndex === -1) {
        return;
      }

      const [movedData] = pageContent.splice(sourceIndex, 1);
      pageContent.splice(
        destinationIndex < sourceIndex
          ? destinationIndex + 1
          : destinationIndex,
        0,
        movedData
      );
    };

    moveItemData(targetBlock.itemData, dargStartBlock.itemData);

    // 修复tab数量
    let tabReduction = 0;
    {
      const targetTab = targetBlock.itemData.tab || 0;
      const draggedBlockTab = dargStartBlock.itemData.tab || 0;

      const tabDifference = draggedBlockTab - targetTab;
      if (tabDifference > 1) {
        tabReduction = tabDifference - 1;
      }

      // 修正tab
      dargStartBlock.itemData.tab = draggedBlockTab - tabReduction;
    }

    if (subElItems.length) {
      // 子元素也带走
      let previousItemData = dargStartBlock.itemData;
      subElItems.forEach((subElement) => {
        const subItemData = subElement.itemData;
        moveItemData(previousItemData, subItemData);

        if (tabReduction > 0) {
          // 修正子元素tab
          subItemData.tab -= tabReduction;
        }

        previousItemData = subItemData;
      });
    }
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
