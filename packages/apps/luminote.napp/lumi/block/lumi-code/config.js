const defaults = {
  tag: "lumi-code",
  src: "/packages/apps/luminote.napp/lumi/block/lumi-code/lumi-code.html",
  icon: `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="M4.825 12.025L8.7 15.9q.275.275.275.7t-.275.7t-.7.275t-.7-.275l-4.6-4.6q-.15-.15-.213-.325T2.426 12t.063-.375t.212-.325l4.6-4.6q.3-.3.713-.3t.712.3t.3.713t-.3.712zm14.35-.05L15.3 8.1q-.275-.275-.275-.7t.275-.7t.7-.275t.7.275l4.6 4.6q.15.15.213.325t.062.375t-.062.375t-.213.325l-4.6 4.6q-.3.3-.7.288t-.7-.313t-.3-.712t.3-.713z"/></svg>`,
  name: {
    en: "Code",
    cn: "代码",
  },
  desc: {
    en: "A component for friendly code display",
    cn: "用于友好展示代码的组件",
  },
  _getUseContenteditable() {
    return false;
  },
};

export default defaults;
