// 用户卡片相关方法

import { get } from "/packages/fs/handle/index.js";
import { verify } from "/packages/core/base/verify.js";

// 保存用户卡片
export const saveUserCard = async (cardData, toCache = false) => {
  // 验证卡片数据是否正确
  const result = await verify(cardData);

  if (!result) {
    throw new Error("card data verify failed");
  }

  let cardsDir;

  if (toCache) {
    cardsDir = await get("local/caches/cards", { create: "dir" });
  } else {
    cardsDir = await get("local/system/user/cards", { create: "dir" });
  }

  const userData = new Map(cardData.data);

  const fileHandle = await cardsDir.get(userData.get("userID"), {
    create: "file",
  });

  await fileHandle.write(JSON.stringify(cardData));

  return true;
};

/**
 * 根据参数，获取用户卡片信息
 * @param {Object} param0 获取用户的参数
 */
export const getUserCard = async (userId) => {
  const cards = await get("local/system/user/cards", { create: "dir" });

  const cardData = await getUserCardByWithDir(cards, userId);

  if (cardData) {
    return cardData;
  }

  return await getUserCardByWithDir(
    await get("local/caches/cards", { create: "dir" }),
    userId
  );
};

const getUserCardByWithDir = async (cardsDir, userId) => {
  //   const users = [];

  for await (let item of cardsDir.values()) {
    let data = await item.text();
    data = JSON.parse(data);

    const result = await verify(data);

    if (!result) {
      // TODO: 错误用户卡片报错处理
      continue;
    }

    if (userId) {
      const userData = new Map(data.data);

      if (userId && userData.get("userID") !== userId) {
        continue;
      }
    }

    return data;

    // users.push(data);
  }

  return null;

  //   return users;
};
