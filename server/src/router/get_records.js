const handleRecord = ({ client, connectionSaver }) => {
  client.send({
    type: "get_records",
    records: [],
    pagination: {
      page: 1, // 当前页码
      pageSize: 10, // 每页显示条数
      total: 0, // 总记录数
      totalPages: 1, // 总页数
    },
  });
};

handleRecord.admin = true;

export default handleRecord;
