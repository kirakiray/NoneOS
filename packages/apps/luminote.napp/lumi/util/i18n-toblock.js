import { ask, clearAsk } from "/packages/ai/ask.js";
import { getHash } from "/packages/fs/util.js";

export const getMainLang = async (el) => {
  const notePage = el.parents.find(
    (e) => e.tag === "o-page" && e.src.includes("note.html")
  );

  const oapp = el.parents.find((e) => e.tag == "o-app");

  if (!oapp || !notePage) {
    return null;
  }

  const projectItem = await oapp.getProject(
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
      const titleI18nContent = item.titleI18nContent;

      for (let lang of langs) {
        const i18Data = titleI18nContent[lang];
        if (i18Data) {
          // 计算hash是否匹配
          debugger;
        }

        debugger;
      }

      // 翻译子内容
      await fillTranslate(Array.from(item.content), { callback, langs });
    } else {
      // 翻译value
      debugger;
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

  let promptLang = "";
  switch (lang) {
    case "en":
      promptLang = "英语";
      break;
    case "cn":
      promptLang = "中文";
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

  const originHash = await getHash(itemData[keys.originKey]);

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

${itemData[keys.originKey]}
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
      originKey: "value",
      i18nKey: "i18nContent",
    };
  }

  try {
    if (onStateChange) onStateChange(1);

    if (block._asking) {
      clearAsk(block.xid);
      delete block._asking;
    }

    const mainLang = await getMainLang(lumipage || block);

    if (
      !mainLang ||
      !block.itemData[keys.originKey] ||
      !block.itemData[keys.originKey].trim()
    ) {
      if (onStateChange) onStateChange(false);
      return null;
    }

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
