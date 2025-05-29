import { get } from "/packages/fs/main.js";
import { createData } from "/packages/hybird-data/main.js";
import { getUserStore } from "../user-store.js";
import { signData } from "../sign.js";

const stores = {};

// 获取用户卡片数据
export const getCards = async (useLocalUserDirName) => {
  useLocalUserDirName = useLocalUserDirName || "main";
  const cardsDir = await get(`system/cards/${useLocalUserDirName}`, {
    create: "dir",
  });
  let cardStorePms = null;

  if (!stores[useLocalUserDirName]) {
    cardStorePms = stores[useLocalUserDirName] = createData(cardsDir);
  } else {
    cardStorePms = stores[useLocalUserDirName];
  }

  const cardStore = await cardStorePms;

  await cardStore.ready();

  return cardStore;
};

// 获取自己的用户卡片数据
export const getMyCardData = async (useLocalUserDirName) => {
  useLocalUserDirName = useLocalUserDirName || "main";
  const storeData = await getUserStore(useLocalUserDirName);

  const data = await signData(
    {
      userName: storeData.userName,
    },
    useLocalUserDirName
  );

  return data;
};
