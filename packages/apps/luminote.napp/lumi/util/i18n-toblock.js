import { solicit } from "/packages/ai/main.js";
import { getHash } from "/packages/fs/util.js";
import { getRealLang } from "../../util/get-real-lang.js";

export const getMainLang = async (el) => {
  const notePage = el.parents.find(
    (e) => e.tag === "o-page" && e.src.includes("note.html")
  );

  if (!notePage) {
    return null;
  }

  const projectItem = await el.app.getProject(
    notePage.currentDirName,
    notePage.currentUserId
  );

  return projectItem.data.mainLang;
};

// 翻译整个项目
export const translateProject = async ({ projectData, lang, onchange }) => {
  const mainLang = projectData.mainLang; // 当前项目的语言

  const hostData = {
    translatedItemCount: 0,
    totalItemCount: 0,
  };

  for (let article of projectData.main) {
    translateArticle({
      article,
      lang,
      originLang: mainLang,
      hostData,
      onchange,
    });
  }
};

// 翻译整个文章
const translateArticle = async ({
  article,
  lang,
  originLang,
  hostData,
  onchange,
}) => {
  if (originLang === lang) {
    return; // 同语言不需要翻译
  }

  if (!article) {
    return;
  }

  // 翻译文章标题
  if (article.title && article.title.trim()) {
    hostData.totalItemCount++;
    onchange && onchange({ ...hostData });
    translateItemData({
      itemData: article,
      hostKey: "title",
      i18nKey: "titleI18nContent",
      lang,
      finalCall: () => {
        hostData.translatedItemCount++;
        onchange && onchange({ ...hostData });
      },
      execute: true,
      groupTitle: `翻译文章内容: ${article.title}`,
      desc: `将文章标题翻译成"${getRealLang(lang)}"`,
    });
  }

  // 翻译文章内容块
  if (article.content && Array.isArray(article.content)) {
    for (let index = 0; index < article.content.length; index++) {
      const contentBlock = article.content[index];
      if (contentBlock.type === "article") {
        // 递归翻译子文章
        translateArticle({
          article: contentBlock,
          lang,
          originLang,
          hostData,
          onchange,
        });
      } else if (contentBlock.value && contentBlock.value.trim()) {
        // 翻译普通内容块
        hostData.totalItemCount++;
        onchange && onchange({ ...hostData });
        translateItemData({
          itemData: contentBlock,
          hostKey: "value",
          i18nKey: "i18nContent",
          lang,
          finalCall: () => {
            hostData.translatedItemCount++;
            onchange && onchange({ ...hostData });
          },
          execute: true,
          groupTitle: `翻译文章内容: ${article.title}`,
          desc: `将第${index + 1}个段落翻译成"${getRealLang(lang)}"`,
        });
      }
    }
  }
};

// 翻译单个项目的综合性方法
export const translateItemData = async ({
  itemData,
  hostKey,
  i18nKey,
  lang,
  onstream,
  finalCall,
  target,
  execute,
  groupTitle,
  desc,
}) => {
  const currentHash = await getHash(itemData[hostKey]);

  let i18nContent = itemData[i18nKey];

  if (!i18nContent) {
    itemData[i18nKey] = {};
    i18nContent = itemData[i18nKey];
  }

  if (i18nContent[lang] && i18nContent[lang].originHash === currentHash) {
    finalCall && finalCall(i18nContent[lang].value);
    return;
  }

  const _cancelTranslate = solicit({
    groupTitle,
    desc,
    target,
    execute,
    onstart: () => {
      return `你是一名专业本地化工程师。接下来我会给你一段 HTML 源码，请逐字翻译其中的人类可读文本，同时：
1. 保留所有标签、属性、占位符、实体、注释及代码结构不变；
2. 不要翻译标签名、属性名、class、id、URL、脚本、样式内容；
3. 仅将显示在页面上的自然语言文本翻译成${getRealLang(lang)}；
4. 不要添加或删除任何标签。
HTML 如下：

${itemData[hostKey]}
`;
    },
    onstream: (e) => onstream && onstream(e.responseText),
    onsuccess: (e) => {
      i18nContent[lang] = {
        originHash: currentHash,
        modelName: e.modelName,
        value: e.responseText,
        time: Date.now(),
      };

      finalCall && finalCall(e.responseText);
    },
  });

  return _cancelTranslate;
};

// 获取翻译的进度
export const getTranslationProgress = async (contentBlocks, languages) => {
  // 确保languages是数组
  const langArray = Array.isArray(languages) ? languages : [languages];

  // 为每种语言初始化计数器
  const result = {};
  for (const lang of langArray) {
    result[lang] = {
      translatedItemCount: 0,
      totalItemCount: 0,
    };
  }

  for (let i = 0; i < contentBlocks.length; i++) {
    const contentBlock = contentBlocks[i];
    if (contentBlock.type === "article") {
      // 把title也计算进去
      const titleI18nContent = contentBlock.titleI18nContent;

      const titleHash = await getHash(contentBlock.title);

      for (let i = 0; i < languages.length; i++) {
        const lang = languages[i];
        result[lang].totalItemCount++;

        if (titleI18nContent && titleI18nContent[lang]) {
          if (titleI18nContent[lang].originHash === titleHash) {
            result[lang].translatedItemCount++;
          }
        }
      }

      const progressData = await getTranslationProgress(
        contentBlock.content,
        langArray
      );

      // 累加每种语言的结果
      for (const lang of langArray) {
        if (progressData[lang]) {
          result[lang].translatedItemCount +=
            progressData[lang].translatedItemCount;
          result[lang].totalItemCount += progressData[lang].totalItemCount;
        }
      }
    } else {
      // 为每种语言单独统计
      for (const lang of langArray) {
        if (!contentBlock.value.trim()) {
          // 跳过空白
          continue;
        }

        result[lang].totalItemCount++;

        const { i18nContent } = contentBlock;
        if (!i18nContent) {
          continue;
        }

        const hash = await getHash(contentBlock.value);

        if (i18nContent[lang] && i18nContent[lang].originHash === hash) {
          result[lang].translatedItemCount++;
        }
      }
    }
  }

  return result;
};

export const clearTranslatedContent = async (contentBlocks, lang) => {
  for (let i = 0; i < contentBlocks.length; i++) {
    const contentBlock = contentBlocks[i];
    if (contentBlock.type === "article") {
      // 清除 title 翻译
      const { titleI18nContent } = contentBlock;
      if (titleI18nContent) {
        titleI18nContent[lang] = undefined;
      }

      contentBlock.content = await clearTranslatedContent(
        contentBlock.content,
        lang
      );
    } else {
      const { i18nContent } = contentBlock;
      if (i18nContent) {
        i18nContent[lang] = undefined;
      }
    }
  }
  return contentBlocks;
};
