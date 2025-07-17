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

    const currentDragEnterBlock = $(lumiBlock);

    const pageContent = lumipage.itemData.content;
    const moveItem = (currentItemData, targetItemData) => {
      // 位移数据
      const currentIndex = pageContent.indexOf(currentItemData);
      const startIndex = pageContent.indexOf(targetItemData);

      if (currentIndex === -1 || startIndex === -1) {
        return;
      }

      const [targetData] = pageContent.splice(startIndex, 1);
      pageContent.splice(currentIndex, 0, targetData);
    };

    moveItem(currentDragEnterBlock.itemData, dargStartBlock.itemData);

    if (subElItems.length) {
      let prevItemData = dargStartBlock.itemData;
      subElItems.forEach((subElItem) => {
        const subItem = subElItem.itemData;
        moveItem(prevItemData, subItem);
        prevItemData = subItem;
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
