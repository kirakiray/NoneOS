import { getSetting } from "../none-os/setting.js";
import { Stanz } from "/packages/libs/stanz/main.js";

(() => {
  const load = lm(import.meta);
  load("./n-desc.html");
})();

// 多语言的存储主体对象
export const space = new Stanz({});

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

export const createGetText = (spaceName) => {
  return (key, data) => {
    return getText(key, spaceName, data);
  };
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
// export const getLang = () => settingData.lang;

const listeners = [];

let oldLang = null;
export const getLang = () => oldLang;

export const getLangAsync = async () => {
  const settingData = await getSetting();

  return settingData.lang;
};

(async () => {
  const settingData = await getSetting();

  oldLang = settingData.lang;

  settingData.watchTick(async () => {
    if (oldLang === settingData.lang) {
      return;
    }

    oldLang = settingData.lang;

    // 切换语言后，修正语言包
    await Promise.all(
      Object.entries(spacePath).map(async ([key, path]) => {
        const data = await fetch(`${path}/${settingData.lang}.json`).then((e) =>
          e.json()
        );

        Object.assign(space[key], data);
      })
    );

    // 触发监听器
    listeners.forEach((e) => e());
  });
})();

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

  const settingData = await getSetting();

  const langData = await fetch(`${path}/${settingData.lang}.json`)
    .then((e) => e.json())
    .catch(() => {
      return fetch(`${path}/en.json`)
        .then((e) => e.json())
        .catch(() => {
          return fetch(`${path}/cn.json`).then((e) => e.json());
        });
    });

  Object.assign(space[name], langData);

  if (spaceWaiter[name] && spaceWaiter[name] !== 1) {
    spaceWaiter[name].forEach((res) => res());
  }

  spaceWaiter[name] = 1;
};
