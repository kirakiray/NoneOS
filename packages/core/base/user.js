// 本地用户的相关模块
import { get } from "/packages/fs/handle/index.js";
import { getId } from "./pair.js";
import { signData } from "./sign.js";

/**
 * 获取用户信息
 * @returns Object
 */
export const getInfo = async () => {
  const handle = await get("local/system/user/info", {
    create: "file",
  });

  let data = await handle.text();

  if (data) {
    data = JSON.parse(data);
  } else {
    // 没有用户信息的情况下，添加一个默认名
    const uid = await getId();

    data = {
      userName: `user-${uid.slice(10, 16)}`,
    };

    await handle.write(JSON.stringify(data));
  }

  return data;
};

/**
 * 设置用户信息
 * @param {Object} data 用户信息对象
 */
export const setInfo = async (data) => {
  const userInfo = await getInfo();

  Object.assign(userInfo, data);

  const handle = await get("local/system/user/info", {
    create: "file",
  });

  await handle.write(JSON.stringify(userInfo));

  return true;
};

/**
 * 获取自己用户卡片数据
 */
export const getSelfUserCard = async () => {
  const userInfo = await getInfo();
  const userId = await getId();

  return await signData([
    ["userName", userInfo.userName],
    ["userID", userId],
  ]);
};
