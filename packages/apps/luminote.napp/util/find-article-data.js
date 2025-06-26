export const findArticle = async (app, dataId) => {
  const articleData = (await app.getCurrentProject()).data;
  const { main } = articleData;

  return await findTargetArticle(main, dataId);
};

const findTargetArticle = async (content, dataId) => {
  for (let e of content) {
    if (e._dataId === dataId) {
      return { target: e };
    }

    if (e.content) {
      let result = await findTargetArticle(e.content, dataId);
      if (result?.target) {
        return { target: result.target };
      }
    }
  }
};
