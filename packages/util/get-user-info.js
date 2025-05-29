import { getRemotes } from "./get-remotes.js";

export const getUserName = async (userId) => {
  const remotes = await getRemotes();

  // 从本地设备中获取用户名
  const targetUser = remotes.find((e) => e.userId === userId);
  if (targetUser) {
    return targetUser.userName;
  }

  return userId;
};
