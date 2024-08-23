import { User } from "../public-user.js";
import { ClientUser } from "./client-user.js";
import { ServerConnector } from "./server-connector.js";
import { clients, connectors } from "./public.js";
export { bind } from "./public.js";

// 连接用户
export const linkUser = async (data, dataSignature) => {
  const userData = new User(data, dataSignature);

  let targetCUser = clients.get(userData.userID);

  if (!targetCUser) {
    targetCUser = new ClientUser(data, dataSignature);

    targetCUser.connect();

    clients.set(targetCUser.id, targetCUser);
  }

  return targetCUser;
};

// 可访问服务器列表
export const defaultServerList = [
  "http://localhost:5569/user",
  "https://tutous.com:55691/user",
];

// 初始化默认服务器
defaultServerList.forEach((e) => {
  connectors.push(new ServerConnector(e));
});

export const getServers = () => {
  return [...connectors];
};

export const addServer = (url) => {};
