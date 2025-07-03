export const inlineComps = [
  {
    inlineComponentSrc:
      "/packages/apps/luminote.napp/lumi/inline/lumi-quote/lumi-quote.html",
    formComponentSrc:
      "/packages/apps/luminote.napp/lumi/inline/lumi-quote/lumi-quote-form.html",
    tag: "lumi-quote",
    formTag: "lumi-quote-form",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 48 48"><defs><mask id="ipSDocAdd0"><g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="4"><path fill="#fff" stroke="#fff" d="M38 4H10a2 2 0 0 0-2 2v36a2 2 0 0 0 2 2h28a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2"/><path stroke="#000" d="M17 30h14m-14 6h7m-5-19h10m-5 5V12"/></g></mask></defs><path fill="currentColor" d="M0 0h48v48H0z" mask="url(#ipSDocAdd0)"/></svg>',
    name: {
      en: "Create Explanation Note",
      cn: "解释这段文字",
    },
    desc: {
      en: "Create a new note to explain the selected content.",
      cn: "新建一份笔记，对选中内容进行解释说明。",
    },
    // 点击内联组件时触发
    click() {
      debugger;
    },
  },
];
