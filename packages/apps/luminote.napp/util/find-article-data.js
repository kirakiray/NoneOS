export const findArticle = async ({
  app,
  dataId,
  userId = "self",
  dirName,
  isAddProject,
}) => {
  let project;
  if (isAddProject) {
    project = await app.pushProject(dirName, userId, {
      isSave: false,
    });
  } else {
    project = await app.getProject(dirName, userId);
  }

  const articleData = project.data;
  const { main } = articleData;

  return await findTargetArticle(main, dataId);
};

const findTargetArticle = async (content, dataId) => {
  for (let e of content) {
    if (e.aid === dataId || e._dataId === dataId) {
      return {
        target: e,
        paths: [e],
      };
    }

    if (e.content) {
      let { target, paths: subPaths } = await findTargetArticle(
        e.content,
        dataId
      );
      if (target) {
        return {
          target,
          paths: [e, ...subPaths],
        };
      }
    }
  }

  return {};
};
