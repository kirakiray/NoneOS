export const getListData = async ({
  list,
  lang,
  mainLang,
  callback,
  needContent,
}) => {
  let listData = await Promise.all(
    list.map(async (item) => {
      if (item.type === "article" && !item.removed) {
        const data = {
          aid: item.aid,
          title: item.title,
        };

        if (mainLang !== lang) {
          if (item.titleI18nContent && item.titleI18nContent[lang]) {
            data.title = item.titleI18nContent[lang].value;
          }
        }

        if (callback) {
          await callback(item, lang);
        }

        if (needContent) {
          data.content = item.content;
        }

        const subList = await getListData({
          list: item.content,
          lang,
          mainLang,
          callback,
          needContent,
        });

        if (subList.length) {
          data.list = subList;
        }

        return data;
      }
    })
  );

  return listData.filter((e) => !!e);
};
