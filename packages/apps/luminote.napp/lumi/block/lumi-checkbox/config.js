const defaults = {
  tag: "lumi-checkbox",
  src: "/packages/apps/luminote.napp/lumi/block/lumi-checkbox/lumi-checkbox.html",
  icon: `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="M2 2h13v5.5h-2V4H4v9h3.5v2H2zm7 7h13v13H9zm2 2v9h9v-9zm8.414 3L15 18.414L12.086 15.5l1.414-1.414l1.5 1.5l3-3z"/></svg>`,
  name: {
    en: "Checkbox",
    cn: "复选框",
  },
  desc: {
    en: "A component for checkbox display",
    cn: "复选框的组件",
  },
  _getUseContenteditable() {
    return true;
  },
  keepEnterNext: true, // 回车时，保持下一个元素也是该组件
};

export default defaults;
