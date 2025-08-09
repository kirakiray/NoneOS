// 改变项目的主体语言
import { getHash } from "/packages/fs/util.js";

export const changeLang = async (projectData, lang) => {
  for (let articleData of projectData.main) {
    await changeArticle(articleData, lang, projectData.mainLang);
  }

  const oldMainLang = projectData.mainLang;

  // 最后更改主体语言
  projectData.mainLang = lang;

  const langIndex = projectData.otherLang.indexOf(lang);
  if (langIndex !== -1) {
    projectData.otherLang.splice(langIndex, 1);
  }

  // 最后添加到 otherLang 数组
  projectData.otherLang.unshift(oldMainLang);
};

const changeArticle = async (articleData, lang, originLang) => {
  for (let item of articleData.content) {
    const { i18nContent, value } = item;

    const reValue = i18nContent[lang]?.value || value;

    const hash = await getHash(reValue);

    // 将主体替换为要切换的语言的内容
    item.value = reValue;

    // 删除旧的语言对象
    if (i18nContent[lang]) {
      delete i18nContent[lang];
    }

    // 保存翻译前的内容
    i18nContent[originLang] = {
      modelName: "",
      originHash: hash,
      time: Date.now(),
      value: value,
    };

    // 修正剩余的对象的hash
    for (let [key, obj] of Object.entries(i18nContent)) {
      if (key === "dataStatus" || key === originLang) {
        continue;
      }

      obj.originHash = hash;
    }

    if (item.type === "article") {
      await changeArticle(item, lang, originLang);
    }
  }
};
