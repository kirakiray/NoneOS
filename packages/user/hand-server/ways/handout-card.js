import { getCards } from "../../card/main.js";

// 获得派发的用户卡片
export const handoutCard = async ({
  fromUserId,
  agentData,
  userDirName,
  userStore,
}) => {
  const { cardData } = agentData;

  const cards = await getCards(userDirName);

  await cards.ready(true); // 确认卡牌数据已经加载完毕

  // 查找是否已经存在相同的卡片
  const exitedCardIndex = cards.findIndex(
    (e) => e.data.publicKey === cardData.data.publicKey
  );

  if (exitedCardIndex > -1) {
    // 如果存在相同的卡片，就替换掉
    cards[exitedCardIndex] = cardData;
    // cards.splice(exitedCardIndex, 1);
  } else {
    // 添加卡片
    cards.push(cardData);
  }
};
