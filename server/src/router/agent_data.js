import { pack } from "../../../packages/user/util/pack.js";

const handleAgentData = async ({ client, message, binaryData, clientManager }) => {
  const { options, data } = message;
  const { userId, userSessionId } = options;

  if (!userId) return;

  const targetUserData = clientManager.getUserById(userId);
  if (!targetUserData || !targetUserData.userPool) return;

  let sendData;
  try {
    sendData = pack(
      {
        type: "agent_data",
        fromUserId: client.userId,
        fromUserSessionId: client.userSessionId,
      },
      binaryData
    );
  } catch (err) {
    console.error("打包数据失败:", err);
    return;
  }

  let targetDeviceClient = null;

  if (userSessionId) {
    targetDeviceClient = Array.from(targetUserData.userPool).find(
      (c) => c.userSessionId === userSessionId
    );
  }

  if (!targetDeviceClient) {
    targetDeviceClient = targetUserData.userPool.values().next().value;
  }

  if (targetDeviceClient) {
    targetDeviceClient.send(sendData);
  }
};

handleAgentData.admin = false;

export default handleAgentData;