export const findArticle = async (app, dataId, userId = "self", dirName) => {
  // 不是当前设备，就要请求远端了
  // const project = await app.getProject(dirName, userId);
  const project = await app.pushProject(dirName, userId, {
    isSave: false,
  });

  const articleData = project.data;
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
