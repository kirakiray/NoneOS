export const findArticle = async ({
  app,
  dataId,
  aid,
  userId = "self",
  dirName,
  isAddProject,
}) => {
  if (dataId) {
    debugger;
    aid = dataId;
  }

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

  return await findTargetArticle(main, aid);
};

const findTargetArticle = async (content, aid) => {
  for (let e of content) {
    if (e.aid === aid) {
      return {
        target: e,
        paths: [e],
      };
    }

    if (e.content) {
      let { target, paths: subPaths } = await findTargetArticle(e.content, aid);
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
