import { getSetting } from "../none-os/setting.js";

let currentLang = "en";

export const getLocalized = async (obj) => {
  const settingData = await getSetting();
  const { lang } = settingData;

  currentLang = settingData.lang;

  if (!obj[lang]) {
    return obj.en || obj.cn;
  }

  return obj[lang];
};

export const getLocalizedSync = (obj) => {
  if (!obj[currentLang]) {
    return obj.en || obj.cn;
  }

  return obj[currentLang];
};

export const localizedObject = (obj) => {
  const reobj = $.stanz({});

  getSetting().then((settingData) => {
    const refresh = () => {
      const { lang } = settingData;

      currentLang = lang;

      Object.keys(obj).forEach((key) => {
        reobj[key] = obj[key][lang];
      });
    };

    const wid = settingData.watchTick(() => {
      refresh();
    });

    reobj._clear = () => {
      settingData.unwatch(wid);
      reobj.revoke();
    };

    refresh();
  });

  return reobj;
};
