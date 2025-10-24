// 主动获取用户推送的卡片更新
export default async function updateUserCard({
  fromUserId,
  fromUserSessionId,
  data,
  server,
  localUser,
}) {
  const cardManager = await localUser.cardManager();

  await Promise.all(
    data.cards.map(async (card) => {
      await cardManager.save(card);
    })
  );
}
