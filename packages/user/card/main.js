import { get } from "/packages/fs/main.js";
import { createData } from "/packages/hybird-data/main.js";
import { getUserStore } from "../user-store.js";
import { signData } from "../sign.js";

let stores = {};

// 获取用户卡片数据
export const getCards = async (userDirName) => {
  userDirName = userDirName || "main";
  const cardsDir = await get(`system/cards/${userDirName}`, {
    create: "dir",
  });
  let cardStorePms = null;

  if (!stores[userDirName]) {
    cardStorePms = stores[userDirName] = createData(cardsDir);
  } else {
    cardStorePms = stores[userDirName];
  }

  const cardStore = await cardStorePms;

  await cardStore.ready();

  return cardStore;
};

// 获取自己的用户卡片数据
export const getMyCardData = async (userDirName) => {
  userDirName = userDirName || "main";
  const storeData = await getUserStore(userDirName);

  const data = await signData(
    {
      userName: storeData.userName,
    },
    userDirName
  );

  return data;
};
