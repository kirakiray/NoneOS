export const getRealLang = (lang) => {
  switch (lang) {
    case "cn":
      return "简体中文";
    case "en":
      return "English";
    case "t-cn":
      return "繁體中文";
    case "ja":
      return "日本語";
    default:
      return lang;
  }
};
