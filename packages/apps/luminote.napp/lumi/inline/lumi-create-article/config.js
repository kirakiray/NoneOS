import { createArticleData } from "../../../util/create-article-data.js";

const defaults = {
  inlineComponentSrc:
    "/packages/apps/luminote.napp/lumi/inline/lumi-link/lumi-link.html",
  formComponentSrc:
    "/packages/apps/luminote.napp/lumi/inline/lumi-link/lumi-link-form.html",
  tag: "lumi-link",
  formTag: "lumi-link-form",
  icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 48 48"><defs><mask id="ipSDocAdd0"><g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="4"><path fill="#fff" stroke="#fff" d="M38 4H10a2 2 0 0 0-2 2v36a2 2 0 0 0 2 2h28a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2"/><path stroke="#000" d="M17 30h14m-14 6h7m-5-19h10m-5 5V12"/></g></mask></defs><path fill="currentColor" d="M0 0h48v48H0z" mask="url(#ipSDocAdd0)"/></svg>',
  name: {
    en: "Create Explanation Note",
    cn: "解释这段文字",
    ja: "このテキストを説明するノートを作成する",
  },
  desc: {
    en: "Create a new note to explain the selected content.",
    cn: "新建一篇笔记，对选中内容进行解释说明。",
    ja: "選択したテキストを説明する新しいノートを作成する",
  },
  // 点击内联组件时触发
  click({ blockItemData, pageItemData, blockEl, selectionRangeLetter }) {
    const selectionText = selectionRangeLetter.map((e) => e.text).join(""); // 选中的文本内容

    // 在目标区域下创建一篇文章组件，并添加到后面
    const targetIndex = pageItemData.content.indexOf(blockItemData);

    const articleData = createArticleData();

    articleData.title = selectionText;

    // 添加到正文内
    pageItemData.content.splice(targetIndex + 1, 0, articleData);

    // 获取真实的item数据
    const realItemData = pageItemData.content[targetIndex + 1];

    setTimeout(() => {
      const [targetNotePage] = blockEl.parents.filter((e) =>
        e?.src?.includes("note.html")
      );

      if (targetNotePage) {
        // 一秒后跳转到对应的文章
        targetNotePage.goto(
          `./note.html?article_id=${realItemData.aid}&dir_name=${targetNotePage.currentDirName}&user_id=${targetNotePage.currentUserId}`
        );
      }
    }, 200);

    return {
      // 给内联组件添加文章的id
      selectedArticleId: realItemData._dataId,
      type: "internal",
    };
  },
};

export default defaults;
