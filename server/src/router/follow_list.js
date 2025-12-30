const handleFollowList = ({ client, message, clientManager }) => {
  const newFollowUsers = message.follows.split(",");
  clientManager.updateFollowList(client, newFollowUsers);
};

handleFollowList.admin = false;

export default handleFollowList;