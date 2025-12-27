const handleGetConnections = ({ client, message, clientManager }) => {
  // 获取分页参数，默认值为第1页，每页20条记录
  const { page = 1, pageSize = 20 } = message || {};

  // 参数校验
  const pageNum = Math.max(1, parseInt(page) || 1);
  const size = Math.max(1, Math.min(100, parseInt(pageSize) || 20)); // 限制最大每页100条

  // 获取所有客户端连接信息
  const allConnections = clientManager
    .getAllClients()
    .map((client2) => ({
      id: client2.cid,
      userId: client2.userId,
      userInfo: client2.userInfo,
      connectTime: client2.connectTime,
      state: client2.state,
      username: client2.userInfo?.name,
      delay: client2.delay,
    }));

  // 计算分页数据
  const total = allConnections.length;
  const totalPages = Math.ceil(total / size);
  const startIndex = (pageNum - 1) * size;
  const connectionsInfo = allConnections.slice(startIndex, startIndex + size);

  client.send({
    type: "connections_info",
    clients: connectionsInfo,
    pagination: {
      page: pageNum,
      pageSize: size,
      total,
      totalPages,
    },
  });
};

handleGetConnections.admin = true;

export default handleGetConnections;