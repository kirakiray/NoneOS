export const setMainColor = (target, color) => {
  if (!color) {
    color = "primary";
  }
  let themeStyle = target.shadow.$("#pui-theme-color");

  if (!themeStyle) {
    themeStyle = $(`<style id="pui-theme-color"></style>`);
    target.shadow.push(themeStyle);
  }

  themeStyle.html = `:host{
    --pui-main-color: var(--md-sys-color-${color});
    --pui-on-main-color: var(--md-sys-color-on-${color});
    --pui-main-color-container: var(--md-sys-color-${color}-container);
    --pui-on-main-color-container: var(--md-sys-color-on-${color}-container);
    --pui-main-hover-color: var(--md-ref-palette-translucent-${color}60);
    --wave-color: var(--md-ref-palette-translucent-${color}50);
  }`;
};

export function bindClick(_this, success) {
  _this.on("click", (e) => {
    if (_this.disabled !== null) {
      e.stopImmediatePropagation();
      return;
    }

    const notSlotEls = _this.filter((e) => {
      if (e.tag === "o-if" || e.tag === "o-else" || e.tag === "o-else-if") {
        return false;
      }

      return e.is(`:not([slot])`);
    });

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
