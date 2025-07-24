import { getSetting } from "../none-os/setting.js";

export const getLocalized = async (obj) => {
  const settingData = await getSetting();
  const { lang } = settingData;

  if (!obj[lang]) {
    return obj.en || obj.cn;
  }

  return obj[lang];
};

export const localizedObject = (obj) => {
  const reobj = $.stanz({});

  getSetting().then((settingData) => {
    const refresh = () => {
      const { lang } = settingData;

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
