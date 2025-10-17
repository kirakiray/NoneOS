// 有用户请求获取用户卡片
export default async function getCard({
  fromUserId,
  fromUserSessionId,
  data,
  server,
  localUser,
}) {
  const cardManager = await localUser.cardManager();

  const cards = [];

  await Promise.all(
    data.userId.map(async (userId) => {
      let card;
      if (localUser.userId === userId) {
        // 如果是获取自己的卡片，则返回自己的卡片
        card = await localUser.createCard();
      } else {
        card = await cardManager.get(userId);
      }

      cards.push(card);
    })
  );

  if (cards.length) {
    // 获取目标的远端用户并发送数据
    const remoteUser = await localUser.connectUser(fromUserId);

    remoteUser.post({
      type: "update-user-card",
      cards,
      __internal_mark: 1,
    });
  }
}
