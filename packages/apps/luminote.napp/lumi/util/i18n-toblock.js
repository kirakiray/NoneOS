import { ask, clearAsk } from "/packages/ai/ask.js";
import { getHash } from "/packages/fs/util.js";

export const getMainLang = async (el) => {
  const notePage = el.parents.find(
    (e) => e.tag === "o-page" && e.src.includes("note.html")
  );

  const oapp = el.parents.find((e) => e.tag == "o-app");

  const projectItem = await oapp.getProject(
    notePage.currentDirName,
    notePage.currentUserId
  );

  return projectItem.data.mainLang;
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

    if (!mainLang || !block.itemData[keys.originKey].trim()) {
      if (onStateChange) onStateChange(false);
      return null;
    }

    if (mainLang === lang) {
      if (onStateChange) onStateChange(false);
      return null;
    }

    if (onStateChange) onStateChange(1);
    if (onTranslateUpdate) onTranslateUpdate({ lang, state: 1 });

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

    let i18nContent = block.itemData[keys.i18nKey];
    if (!i18nContent) {
      block.itemData[keys.i18nKey] = {};
      i18nContent = block.itemData[keys.i18nKey];
    }

    const originHash = await getHash(block.itemData[keys.originKey]);

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

    block.translateContent = "";
    block._asking = lang;

    const result = await ask(
      `保留原来的html标签，将以下文本翻译成${promptLang}，直接返回翻译后的内容：\n ${
        block.itemData[keys.originKey]
      }`,
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
