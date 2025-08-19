import { ask, clearAsk } from "/packages/ai/ask.js";
import { getHash } from "/packages/fs/util.js";

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

// 填充翻译内容
export const fillTranslate = async (list, { callback, langs } = {}) => {
  for (let item of list) {
    if (item.type === "article") {
      // 翻译标题
      for (let lang of langs) {
        await translateItem({
          block: {
            itemData: item,
          },
          lang,
          keys: {
            i18nKey: "titleI18nContent",
            valueKey: "title",
          },
        });
      }

      if (callback) {
        callback(item);
      }

      // 翻译子内容
      await fillTranslate(Array.from(item.content), { callback, langs });
    } else {
      for (let lang of langs) {
        // 翻译value
        await translateItem({
          block: {
            itemData: item,
          },
          lang,
        });
      }

      if (callback) {
        callback(item);
      }
    }
  }
};

// 将内容翻译为指定语言
export const translateItem = async ({
  block, // 要翻译的块
  lang, // 翻译到目标语言
  keys, // 翻译到对应的key
  onTranslateUpdate, // 翻译状态更新回调
}) => {
  const { itemData } = block;

  if (!keys) {
    keys = {
      valueKey: "value",
      i18nKey: "i18nContent",
    };
  }

  let promptLang = "";
  switch (lang) {
    case "en":
      promptLang = "英语";
      break;
    case "cn":
      promptLang = "简体中文";
      break;
    case "t-cn":
      promptLang = "繁体中文";
      break;
    case "ja":
      promptLang = "日语";
      break;
    default:
      promptLang = lang;
  }

  let i18nContent = itemData[keys.i18nKey];
  if (!i18nContent) {
    itemData[keys.i18nKey] = {};
    i18nContent = itemData[keys.i18nKey];
  }

  if (!keys.valueKey) {
    return;
  }

  const originHash = await getHash(itemData[keys.valueKey]);

  if (i18nContent[lang]) {
    if (i18nContent[lang].originHash === originHash) {
      if (onTranslateUpdate) {
        onTranslateUpdate({
          lang,
          state: 3,
          content: i18nContent[lang].value,
        });
      }
      return i18nContent[lang].value;
    }
  }

  if (block) {
    block.translateContent = "";
    block._asking = lang;
  }

  const result = await ask(
    `你是一名专业本地化工程师。接下来我会给你一段 HTML 源码，请逐字翻译其中的人类可读文本，同时：
1. 保留所有标签、属性、占位符、实体、注释及代码结构不变；
2. 不要翻译标签名、属性名、class、id、URL、脚本、样式内容；
3. 仅将显示在页面上的自然语言文本翻译成${promptLang}；
4. 不要添加或删除任何标签。
HTML 如下：

${itemData[keys.valueKey]}
`,
    {
      id: block.xid,
      onChunk: (e) => {
        if (block._asking === lang) {
          block.translateContent = e.responseText;
          if (onTranslateUpdate) {
            onTranslateUpdate({
              lang,
              state: 2,
              content: e.responseText,
            });
          }
        }
      },
    }
  );

  if (!result) {
    if (onError) onError(new Error("Translation failed"));
    return null;
  }

  i18nContent[lang] = {
    originHash,
    modelName: result.modelName,
    value: result.responseText,
    time: Date.now(),
  };

  return result;
};

export const switchLang = async (block, lang, options = {}) => {
  let { onStateChange, onTranslateUpdate, onError, keys, lumipage } = options;

  if (!keys) {
    keys = {
      valueKey: "value",
      i18nKey: "i18nContent",
    };
  }

  try {
    if (block._asking) {
      clearAsk(block.xid);
      delete block._asking;
    }

    const mainLang = await getMainLang(lumipage || block);

    if (
      !mainLang ||
      !block.itemData[keys.valueKey] ||
      !block.itemData[keys.valueKey].trim()
    ) {
      // if (onStateChange) onStateChange(false);
      return null;
    }

    if (onStateChange) onStateChange(1);

    if (mainLang === lang) {
      if (onStateChange) onStateChange(false);
      return null;
    }

    if (onStateChange) onStateChange(1);
    if (onTranslateUpdate) onTranslateUpdate({ lang, state: 1 });

    const result = await translateItem({
      block,
      lang,
      keys,
      onTranslateUpdate,
    });

    if (block._asking === lang) {
      if (onTranslateUpdate) {
        onTranslateUpdate({
          lang,
          state: 3,
          content: result.responseText,
        });
      }
    }

    delete block._asking;
    return result.responseText;
  } catch (err) {
    console.error(err);
    if (onError) onError(err);
    delete block._asking;
    return null;
  }
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
      // TODO: 清除 title 翻译
      debugger;

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
