const handleGetRecordLength = async ({ client, connectionSaver, message }) => {
  try {
    const length = await connectionSaver.connectionDB.getTotalLength(); // 获取记录长度

    client.send({
      type: "get_record_length",
      length,
    });
  } catch (error) {
    console.error("Error in handleGetRecordLength:", error);
    client.send({
      type: "get_record_length",
      length: 0,
    });
  }
};

handleGetRecordLength.admin = true;

export default handleGetRecordLength;
