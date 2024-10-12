import * as util from "./util.js";
import { users, connectUser } from "/packages/connect/user.js";

// 根据key获取值
// 先在本地获取，本地获取不到的情况下，从远端获取
export const getCache = async (key) => {
  const result = await util.getCache(key);

  if (result) {
    return result;
  }

  // 从第一个用户上获取数据
  await users[0]._send({
    type: "getCache",
    hashs: [key],
  });

  // 等待获取数据
  return util.handCache(key);
};
