const handleDisconnectClient = ({ client, message, clientManager }) => {
  const { clientId } = message;
  if (!clientId) {
    client.send({ type: "error", message: "缺少客户端ID参数" });
    return;
  }

  const targetClient = clientManager.getClientById(clientId);
  if (targetClient) {
    targetClient.close();
    client.send({
      type: "success",
      message: `已断开客户端 ${clientId} 的连接`,
    });
  } else {
    client.send({
      type: "error",
      message: `未找到客户端 ${clientId}`,
    });
  }
};

handleDisconnectClient.admin = true;

export default handleDisconnectClient;