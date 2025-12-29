const handleRecord = async ({ client, connectionSaver, message }) => {
  try {
    // 从客户端请求中获取分页参数，如果没有则使用默认值
    const { page = 1, pageSize = 10 } = message || {};

    // 参数校验
    const pageNum = Math.max(1, parseInt(page) || 1);
    const size = Math.max(1, Math.min(100, parseInt(pageSize) || 10)); // 限制最大每页100条

    // 先获取所有记录来计算总数 (这是一个简化实现，实际生产环境中可能需要更高效的计数方法)
    const allRecords = await connectionSaver.connectionDB.batchGet({
      limit: -1,
    }); // 获取所有记录
    const total = allRecords.length;
    const totalPages = Math.ceil(total / size);

    // 根据分页参数获取指定范围的记录
    const offset = (pageNum - 1) * size;
    const pagedRecords = allRecords.slice(offset, offset + size);

    client.send({
      type: "get_records",
      records: pagedRecords.map((record) => record.value), // 只返回记录的值部分
      pagination: {
        page: pageNum, // 当前页码
        pageSize: size, // 每页显示条数
        total, // 总记录数
        totalPages, // 总页数
      },
    });
  } catch (error) {
    console.error("Error in handleRecord:", error);
    client.send({
      type: "get_records",
      records: [],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 1,
      },
    });
  }
};

handleRecord.admin = true;

export default handleRecord;
