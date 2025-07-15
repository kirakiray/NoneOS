export const initDrag = (lumipage) => {
  lumipage.on("drag-block-start", (e) => {
    e.stopPropagation();

    const dragBlock = $(e.target);
    dragBlock.attr("draggable", "true");
  });
};

export const revokeDrag = () => {
  debugger;
};
