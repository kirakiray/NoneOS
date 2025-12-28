export default async ({ activeServer, localUser }) => {
  let servers;
  try {
    servers = JSON.parse(localStorage.getItem("servers")) || [];
  } catch (e) {
    servers = [];
  }

  const target = servers.find((item) => item.server === activeServer);

  // 连接到服务器（管理员模式）
  const serverClient = await localUser.connectServer(activeServer, {
    admin: 1,
    password: target?.password || "",
  });

  return serverClient;
};
