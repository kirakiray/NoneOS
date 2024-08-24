import { User } from "../public-user.js";
import { ClientUser } from "./client-user.js";
import { ServerConnector } from "./server-connector.js";
import { clients, connectors, emitEvent } from "./public.js";
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
  // "https://tutous.com:55691/user",
];

const getSavedServer = () => {
  let servers = localStorage.getItem("__handshake_servers");
  if (servers) {
    servers = JSON.parse(servers);
  }

  return servers || [];
};

// 初始化默认服务器
[...defaultServerList, ...getSavedServer()].forEach((e) => {
  connectors.push(new ServerConnector(e));
});

export const getServers = () => {
  return [...connectors];
};

// 添加服务器
export const addServer = (url) => {
  const servers = getSavedServer();

  servers.push(url);

  localStorage.setItem("__handshake_servers", JSON.stringify(servers));

  connectors.push(new ServerConnector(url));

  emitEvent("server-list-change");
};

// 定时更新机制
let checkTimer;
const checkServer = async () => {
  clearTimeout(checkTimer);
  connectors.forEach((item) => {
    if (item.status === "closed") {
      // 重新初始化
      item.init();
    } else if (item.status === "connected") {
      item.ping();
    }
  });

  checkTimer = setTimeout(() => {
    checkServer();
  }, 10000);
};

checkServer(); // 点火
