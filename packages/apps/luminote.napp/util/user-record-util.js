// 保存每个用户在当前项目中的操作改动信息

import { createUser } from "/packages/user/main.js";

// 保存当前的用户id
export const saveUserCord = async ({
  articleId, // 文章id
  blockId, // 正在写入中的块id
  targetUserId, // 文章所在项目的目标用户id
  projectDirName, // 文章所在项目目录名
  app, // 应用实例
}) => {
  const localUser = await createUser();
  const { userId } = localUser;

  // 调用 getRecordData 获取项目的记录数据
  const recordData = await getRecordData({ projectDirName, targetUserId, app });

  let targetRecord = recordData[userId];

  // 查找并添加用户数据
  if (!targetRecord) {
    targetRecord = recordData[userId] = {};
  }

  // 写入记录数据
  targetRecord.focusArticleId = articleId;
  targetRecord.focusBlockId = blockId;
  targetRecord.focusTime = Date.now();
};

// 获取项目数据
export const getRecordData = async ({ projectDirName, targetUserId, app }) => {
  // 获取项目数据
  const project = await app.getProject(projectDirName, targetUserId);

  const projectData = project.data;

  if (!projectData.recordData) {
    // 用户聚焦记录数据
    projectData.recordData = {};
  }

  return projectData.recordData;
};

export const getRecordByPageId = async ({
  targetUserId,
  projectDirName,
  articleId,
  app,
}) => {
  const recordData = await getRecordData({
    targetUserId,
    projectDirName,
    app,
  });

  const pageRecordData = $.stanz([]);

  const localUser = await createUser();
  const { userId: selfUserId } = localUser;

  const refresh = () => {
    const newRecordData = [];

    Object.entries(recordData).forEach(([userId, recordData]) => {
      if (userId === "dataStatus") {
        // 跳过数据状态的key
        return;
      }

      // 如果是当前页的数据，进行修正记录
      const { focusArticleId, focusBlockId, focusTime } = recordData;

      if (focusArticleId === articleId) {
        // 是当前文章的数据，加入当前页记录
        newRecordData.push({
          userId,
          blockId: focusBlockId,
        });
      }
    });

    try {
      // 更新数据
      pageRecordData.splice(0, pageRecordData.length, ...newRecordData);
    } catch (err) {
      console.log(err);
    }
  };

  const tid = recordData.watchTick(() => refresh(), 100);

  setTimeout(refresh, 0);

  return {
    recordData: pageRecordData,
    revoke() {
      pageRecordData.revoke();
      recordData.unwatch(tid);
      const targetRecord = recordData[selfUserId];
      if (targetRecord) {
        targetRecord.focusArticleId = "";
        targetRecord.focusBlockId = "";
      }
    },
  };
};
