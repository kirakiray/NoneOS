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
