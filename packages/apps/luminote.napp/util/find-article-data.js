export const findArticle = async (app, dataId) => {
  const articleData = (await app.getCurrentProject()).data;
  const { main } = articleData;

  return await findTargetArticle(main, dataId);
};

const findTargetArticle = async (content, dataId) => {
  for (let e of content) {
    if (e._dataId === dataId) {
      return {
        target: e,
        titles: [
          {
            title: e.title,
            dataId: e._dataId,
          },
        ],
      };
    }

    if (e.content) {
      let { target, titles: subTitles } = await findTargetArticle(
        e.content,
        dataId
      );
      if (target) {
        return {
          target,
          titles: [
            {
              title: e.title,
              dataId: e._dataId,
            },
            ...subTitles,
          ],
        };
      }
    }
  }

  return {};
};
