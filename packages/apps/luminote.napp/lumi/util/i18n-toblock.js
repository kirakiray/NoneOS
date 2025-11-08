import { solicit } from "/packages/ai/main.js";
import { getHash } from "/packages/util/hash/main.js";
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

  const trimmedContent = itemData[hostKey].trim();

  // 检查是否只包含特殊符号或emoji符号
  const specialCharOrEmojiRegex =
    /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier})+$/gu;
  if (!trimmedContent || specialCharOrEmojiRegex.test(trimmedContent)) {
    i18nContent[lang] = {
      originHash: currentHash,
      modelName: "auto",
      value: trimmedContent,
      time: Date.now(),
    };

    finalCall && finalCall(trimmedContent);
    return;
  }

  const _cancelTranslate = solicit({
    groupTitle,
    desc,
    target,
    execute,
    onstart: () => {
      //       return `你是一名专业本地化工程师。接下来我会给你一段 HTML 源码，请逐字翻译其中的人类可读文本，同时：
      // 1. 保留所有标签、属性、占位符、实体、注释及代码结构不变；
      // 2. 不要翻译标签名、属性名、class、id、URL、脚本、样式内容；
      // 3. 仅将显示在页面上的自然语言文本翻译成${getRealLang(lang)}；
      // 4. 不要添加或删除任何标签。
      // 5. 请返回格式正确的 HTML 代码。
      // HTML 如下：
      // ${itemData[hostKey]}
      // `;

      return `你是一名本地化工程师，任务是把下面这段 HTML 翻译成 ${getRealLang(
        lang
      )}，要求严格遵守以下规则：

1. 只翻译**人类可读**的文本节点，任何标签、属性、变量、占位符、注释、CDATA、JS/CSS 代码均不得改动。  
2. 保留原始缩进、换行与标签大小写；输出必须是标准 HTML，可直接 diff。  
3. 遇到以下情况保持原样，不做翻译：  
   - HTML 实体（如 \`&nbsp;\`、\`&amp;\`）  
   - 变量/占位符（如 \`{{userName}}\`、\`%{count}\`、\`{{__discount__}}\`）  
   - 缩写、品牌名、专有名词（如 \`USB\`、\`iPhone\`、\`GitHub\`）  
   - 已本地化或无需翻译的属性（如 \`alt="Logo"\` 若公司规定不译）  
4. 如果原文无歧义但目标语言需调整语序，可在 \`<span translate="no">...</span>\` 内保留原文顺序；否则直接翻译。  
5. 输出只给翻译后的完整 HTML，不要附加任何解释或 markdown 代码围栏。

待翻译 HTML：
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
