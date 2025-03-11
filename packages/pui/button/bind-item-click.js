export default function bindClick(_this, success) {
  _this.on("click", (e) => {
    if (_this.disabled !== null) {
      e.stopImmediatePropagation();
      return;
    }

    const notSlotEls = _this.filter((e) => e.is(`:not([slot])`));
    if (notSlotEls.length === 1 && notSlotEls[0].tag === "a") {
      if (e.target.tagName === "A") {
        return;
      }

      e.stopImmediatePropagation();

      if (navigator.userAgent.includes("Firefox")) {
        notSlotEls[0].ele.click();
      } else {
        notSlotEls[0].ele.dispatchEvent(
          new PointerEvent("click", {
            metaKey: e.metaKey,
            shiftKey: e.shiftKey,
            bubbles: e.bubbles,
            cancelable: true,
          })
        );
      }
    }

    success && success();
  });
}
