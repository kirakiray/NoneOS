import { ServerConnector } from "./server-connector.js";
import { emitEvent } from "./public.js";
import { bind } from "./public.js";

// 可访问服务器列表
export const defaultServerList = [
  "http://localhost:5569/user",
  // "https://tutous.com:55691/user",
  // "http://192.168.50.97:5569/user",
];

// 当前服务器列表
export const servers = $.stanz([]);

// 获取保存好的服务器
const getSavedServer = () => {
  let servers = localStorage.getItem("__handshake_servers");
  if (servers) {
    servers = JSON.parse(servers);
  }

  return servers || [];
};

// 初始化默认服务器
[...defaultServerList, ...getSavedServer()].forEach((e) => {
  servers.push({
    serverUrl: e,
    _server: new ServerConnector(e),
  });
});

let serTimer;
// 更新服务器状态
const reloadServers = () => {
  clearTimeout(serTimer);
  serTimer = setTimeout(() => {
    servers.forEach((ser) => {
      const e = ser._server;

      // 更新服务器信息
      Object.assign(ser, {
        name: e.serverName,
        version: e.serverVersion,
        status: e.status,
        serverUrl: e.serverUrl,
        delayTime: e.delayTime,
      });
    });
  }, 100);
};

bind("server-list-change", reloadServers);
bind("server-state-change", reloadServers);
bind("server-ping", reloadServers);

// 添加服务器
export const addServer = (url) => {
  const saveds = getSavedServer();

  const cid = servers.findIndex((e) => e._server.serverUrl === url);

  if (cid > -1) {
    return "repeat";
  }

  saveds.push(url);

  localStorage.setItem("__handshake_servers", JSON.stringify(saveds));

  servers.push({
    serverUrl: url,
    _server: new ServerConnector(url),
  });

  emitEvent("server-list-change");

  return true;
};

// 删除服务器
export const deleteServer = (url) => {
  const saveds = getSavedServer();

  const id = saveds.findIndex((e) => e === url);

  if (id > -1) {
    saveds.splice(id, 1);
  }

  const cid = servers.findIndex((e) => e._server.serverUrl === url);

  if (cid > -1) {
    servers.splice(cid, 1);
  }

  localStorage.setItem("__handshake_servers", JSON.stringify(saveds));

  emitEvent("server-list-change");
};

// 定时更新机制
let checkTimer;
const checkServer = async () => {
  clearTimeout(checkTimer);
  servers.forEach((e) => {
    const item = e._server;

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
