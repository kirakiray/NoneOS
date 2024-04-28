export default function bindItemClick(_this, success) {
  _this.on("click", (e) => {
    if (_this.disabled === null) {
      const notSlotEls = _this.filter((e) => e.is(`:not([slot])`));
      if (
        notSlotEls.length === 1 &&
        notSlotEls[0].tag === "a" &&
        e.target.tagName !== "A"
      ) {
        notSlotEls[0].ele.dispatchEvent(new PointerEvent("click"));
      }

      success && success();
    } else {
      e.stopImmediatePropagation();
    }
  });
}
