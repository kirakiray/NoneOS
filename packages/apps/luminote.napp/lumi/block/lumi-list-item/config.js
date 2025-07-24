const defaults = {
  tag: "lumi-list-item",
  src: "/packages/apps/luminote.napp/lumi/block/lumi-list-item/lumi-list-item.html",
  icon: `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="M7 9V7h14v2zm0 4v-2h14v2zm0 4v-2h14v2zM4 9q-.425 0-.712-.288T3 8t.288-.712T4 7t.713.288T5 8t-.288.713T4 9m0 4q-.425 0-.712-.288T3 12t.288-.712T4 11t.713.288T5 12t-.288.713T4 13m0 4q-.425 0-.712-.288T3 16t.288-.712T4 15t.713.288T5 16t-.288.713T4 17"/></svg>`,
  name: {
    en: "List",
    cn: "列表",
  },
  desc: {
    en: "A component for list display",
    cn: "列表的组件",
  },
  keepEnterNext: true, // 回车时，保持下一个元素也是该组件
  _getMatchKey() {
    // 前置匹配的key
    return [
      ["-", {}],
      ["*", {}],
    ];
  },
  _getUseContenteditable() {
    // 是否有使用 contenteditable 元素
    return true;
  },
};

export default defaults;
