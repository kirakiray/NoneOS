import { initDB } from "../util/init-db.js";

export const getChunk = async ({ hash, remoteUser, ...options }) => {
  const db = await initDB("noneos-" + remoteUser.self.dirName);

  // 优先从表中查找

  // options 中存放有真正的数据来源
  debugger;
};

// 保存块到表中
export const saveChunk = async ({ chunk, remoteUser, ...options }) => {
  const db = await initDB("noneos-" + remoteUser.self.dirName);

  // options 中存放有真正的数据来源
  debugger;
};
