const handleFindUser = ({ client, message, clientManager }) => {
  const { userId } = message;
  const targetUserData = clientManager.getUserById(userId);
  const userPool = targetUserData?.userPool
    ? Array.from(targetUserData.userPool)
    : [];

  client.send({
    type: "response_find_user",
    userId,
    publicKey: userPool.length > 0 ? userPool[0].publicKey : null,
    tabs: userPool,
    isOnline: userPool && userPool.length > 0,
  });
};

handleFindUser.admin = false;

export default handleFindUser;