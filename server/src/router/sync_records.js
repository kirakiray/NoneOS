const handleSyncRecords = async ({ client, connectionSaver, message }) => {
  try {
    const allRecords = await connectionSaver.connectionDB.batchGet({
      gte: message.gte,
      limit: message.limit || 100,
    }); // 获取所有记录

    client.send({
      type: "sync_records",
      records: allRecords,
    });
  } catch (error) {
    console.error("Error in handleSyncRecords:", error);
    client.send({
      type: "sync_records",
      records: [],
    });
  }
};

handleSyncRecords.admin = true;

export default handleSyncRecords;
