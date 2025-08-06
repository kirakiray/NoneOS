const defaults = {
  tag: "lumi-video",
  src: "/packages/apps/luminote.napp/lumi/block/lumi-video/lumi-video.html",
  icon: `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14zM3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
  name: {
    en: "Video",
    cn: "视频",
  },
  desc: {
    cn: "用于展示视频的组件",
    en: "A component for friendly video display",
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
