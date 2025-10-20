export default async function trigger({
  fromUserId,
  fromUserSessionId,
  data: receivedData,
  server,
  channel,
  localUser,
}) {
  const { name, data } = receivedData;

  const pool = localUser.registers[name];
  if (pool) {
    pool.forEach((func) =>
      func({
        data: { ...data },
        fromUserId,
        fromUserSessionId,
      })
    );
  }

  // TODO: 向其他标签发送数据
}
