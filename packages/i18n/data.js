// 当前采用的语言
let lang = localStorage.getItem("_lang") || "en";

// 多语言的存储主体对象
export const space = $.stanz({});

// 存储多语言的主体空间
export const spacePath = {};

export const getText = (key, spaceName) => {
  if (!space[spaceName]) {
    return "";
  }
  return space[spaceName].get(key);
};

export const getSpaceData = (key) => {
  if (!space[key]) {
    space[key] = {};
  }

  return space[key];
};

// 获取当前语言
export const getLang = () => lang;

const listeners = [];

// 切换语言
export const changeLang = async (argLang) => {
  lang = argLang;
  localStorage.setItem("_lang", lang);
  await Promise.all(
    Object.entries(space).map(async ([key, langObj]) => {
      const path = spacePath[key];
      const langData = await fetch(`${path}/${lang}.json`).then((e) =>
        e.json()
      );
      Object.assign(langObj, langData);
    })
  );

  listeners.forEach((f) => f());
};

// 监听语言切换
export const onChangeLang = (func) => {
  listeners.push(func);
  return () => {
    const index = listeners.indexOf(func);
    return listeners.splice(index, 1);
  };
};

// 设置语言包的地址
export const setSpace = async (name, path) => {
  spacePath[name] = path;

  if (!space[name]) {
    space[name] = {};
  }

  const langData = await fetch(`${path}/${lang}.json`).then((e) => e.json());

  Object.assign(space[name], langData);
};
