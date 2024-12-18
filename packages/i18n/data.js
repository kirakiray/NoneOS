// 当前采用的语言
let lang = localStorage.getItem("_lang") || "en";

// 多语言的存储主体对象
export const space = $.stanz({});

// 存储多语言的主体空间
export const spacePath = {};

export const getText = (key, spaceName, data) => {
  if (!space[spaceName]) {
    return "";
  }

  let val = space[spaceName].get(key);

  if (data && /\{.+\}/.test(val)) {
    const matchArr = val.match(/(\{.+?\})/g);
    matchArr &&
      matchArr.forEach((e) => {
        const key = e.replace("{", "").replace("}", "").trim();
        val = val.replace(e, data[key]);
      });
  }

  return val;
};

const spaceWaiter = {};
export const getSpaceData = (name, isWaitSpace) => {
  if (!space[name]) {
    space[name] = {};
  }

  if (isWaitSpace && spaceWaiter[name] !== 1) {
    return new Promise((resolve) => {
      const targetMaps = spaceWaiter[name] || (spaceWaiter[name] = []);
      targetMaps.push(resolve);
    });
  }

  return space[name];
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

  if (spaceWaiter[name] && spaceWaiter[name] !== 1) {
    spaceWaiter[name].forEach((res) => res());
  }

  spaceWaiter[name] = 1;
};
