// 当前采用的语言
let lang = "cn";

// 多语言的存储主体对象
export const space = $.stanz({});

// 存储多语言的主体空间
export const spacePath = {};

// 获取当前语言
export const getLang = () => lang;

// 切换语言
export const changeLang = async (argLang) => {
  lang = argLang;
  Object.entries(space).forEach(async ([key, langObj]) => {
    const path = spacePath[key];
    const langData = await fetch(`${path}/${lang}.json`).then((e) => e.json());
    Object.assign(langObj, langData);
  });
};

// 设置语言包的地址
export const setSpace = async (name, path) => {
  spacePath[name] = path;

  const langData = await fetch(`${path}/${lang}.json`).then((e) => e.json());

  if (!space[name]) {
    space[name] = langData;
  }
};
