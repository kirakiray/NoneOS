import { get, init } from "/packages/fs/handle/main.js";
import { User } from "./user.js";

// 添加 tabSessionID
export const tabSessionid = Math.random().toString(36).slice(2);

// 创建用户数据
export const createUser = async (dirName) => {
  await init("system");

  const userDirHandle = await get(`system/user/${dirName}`, {
    create: "dir",
  });

  const user = new User(userDirHandle);

  await user.init();

  return user;
};
