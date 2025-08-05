const defaults = {
  tag: "lumi-img",
  src: "/packages/apps/luminote.napp/lumi/block/lumi-img/lumi-img.html",
  icon: `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm0-2h14V5H5zm0 0V5zm2-2h10q.3 0 .45-.275t-.05-.525l-2.75-3.675q-.15-.2-.4-.2t-.4.2L11.25 16L9.4 13.525q-.15-.2-.4-.2t-.4.2l-2 2.675q-.2.25-.05.525T7 17"/></svg>`,
  name: {
    en: "Image",
    cn: "图片",
  },
  desc: {
    cn: "用于展示图片的组件",
    en: "A component for friendly image display",
  },
  _getUseContenteditable() {
    // 代码组件使用的是自带的元素
    return false;
  },
  //   _getMatchKey() {
  //     // 前置匹配的key
  //     return [];
  //   },
};

export default defaults;
