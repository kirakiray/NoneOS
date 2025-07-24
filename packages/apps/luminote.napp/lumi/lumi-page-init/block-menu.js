export const initBlockMenu = (lumipage) => {
  let beforeOpendBlock = null;

  lumipage.on(
    "drag-block-start",
    (lumipage._dragStartFunc = (e) => {
      e.stopPropagation();

      if (beforeOpendBlock) {
        beforeOpendBlock.leftMenuOpened = false;
        const lumiBlockMenu = lumipage.shadow.$("lumi-block-menu");
        lumiBlockMenu.open = "off";
      }
    })
  );

  lumipage.on("click-block-menu", (e) => {
    e.stopPropagation();
    const { menuBtn, originEvent } = e.data;

    originEvent.stopPropagation();

    const lumiBlock = $(e.target);

    if (beforeOpendBlock) {
      beforeOpendBlock.leftMenuOpened = false;
    }
    beforeOpendBlock = lumiBlock;
    lumiBlock.leftMenuOpened = true;

    const lumiBlockMenu = lumipage.shadow.$("lumi-block-menu");

    // 修正定位
    const btnRect = menuBtn.getBoundingClientRect();
    const menuRect = lumiBlockMenu.ele.getBoundingClientRect();
    Object.assign(lumiBlockMenu.style, {
      left: `${btnRect.left - menuRect.width}px`,
      top: `${btnRect.top}px`,
    });

    lumiBlockMenu.itemData = lumiBlock.itemData;
    lumiBlockMenu._blockEl = lumiBlock;

    lumiBlockMenu.open = "on";
  });

  document.addEventListener(
    "click",
    (lumipage._cancelBlockMenu = () => {
      if (beforeOpendBlock) {
        beforeOpendBlock.leftMenuOpened = false;
      }

      const lumiBlockMenu = lumipage.shadow.$("lumi-block-menu");
      lumiBlockMenu && (lumiBlockMenu.open = "off");
    })
  );
};

export const revokeBlockMenu = (lumipage) => {
  document.removeEventListener("click", lumipage._cancelBlockMenu);
};
