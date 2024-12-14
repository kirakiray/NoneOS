export const data = $.stanz({
  lang: "cn",
  space: {},
});

export const spacePath = {};

export const changeLang = async (lang) => {
  data.lang = lang;
  Object.entries(data.space).forEach(async ([key, langObj]) => {
    const path = spacePath[key];
    const langData = await fetch(`${path}/${lang}.json`).then((e) => e.json());

    Object.assign(langObj, langData);
  });
};

export const setSpace = async (name, path) => {
  spacePath[name] = path;

  const langData = await fetch(`${path}/${data.lang}.json`).then((e) =>
    e.json()
  );

  if (!data.space[name]) {
    data.space[name] = langData;
  }
};
