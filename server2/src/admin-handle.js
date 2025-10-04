const options = {
  // 获取所有连接的客户端信息
  get_connections({ client, clients, message }) {
    let connectionsInfo = [];
    for (const client2 of clients.values()) {
      connectionsInfo.push({
        id: client2.cid,
        connectTime: client2.connectTime,
      });
    }
    client.send({
      type: "connections_info",
      clients: connectionsInfo,
    });
  },
  // 断开指定客户端的连接
  disconnect_client({ client, clients, message }) {
    if (message.clientId) {
      // 找到任意一个客户端实例来调用 disconnectClient 方法
      const targetClient = clients.get(message.clientId);
      let result = false;
      if (targetClient) {
        result = targetClient.close();

        client.send({
          type: "success",
          message: `已断开客户端 ${message.clientId} 的连接`,
        });
      } else {
        client.send({
          type: "error",
          message: `未找到客户端 ${message.clientId}`,
        });
      }
    } else {
      client.send({
        type: "error",
        message: "缺少客户端ID参数",
      });
    }
  },
};

export default options;
