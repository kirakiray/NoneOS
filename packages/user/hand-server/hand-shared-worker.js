import { Stanz } from "../../libs/stanz/main.js";
import { getUserStore } from "../user-store.js";
import { HandServer } from "./handserver.js";

// 存储所有连接的客户端端口
const ports = new Set();

// 获取userdirname
const userDirName = new URLSearchParams(location.search).get("userdir");

// 生成服务器对象数据
const servers = new Stanz([]);

// 获取用户数据
const userStorePms = getUserStore(userDirName);
userStorePms.then(async (userStore) => {
  await userStore.ready(true);

  // 初始化服务器列表
  userStore.servers.forEach((e) => {
    const client = new HandServer({
      store: userStore,
      url: e.url,
    });

    client.connect();

    servers.push(client);
  });

  console.log("servers", servers);

  return userStore;
});

// TEST: 定时检查连接
setInterval(() => {
  servers.forEach((e) => {
    e.connect();
  });
}, 5000);

// 监听连接事件
servers.watchTick(() => {
  const serverList = servers.toJSON();

  // 广播服务器列表
  ports.forEach((port) => {
    port.postMessage({
      resType: "update",
      resData: {
        servers: serverList,
      },
    });
  });
});

self.onconnect = async (e) => {
  const port = e.ports[0];
  ports.add(port);

  console.log("连接成功", ports);

  port.onmessage = async (e) => {
    const { agentType, agentData } = e.data;

    switch (agentType) {
      case "close": {
        port.close();
        ports.delete(port);
        break;
      }
      case "ping": {
        const { key } = agentData;

        const server = servers.find((e) => e.key === key);
        if (server) {
          server.ping();
        }

        break;
      }
      case "post": {
        const { key, taskID, data } = agentData;
        const server = servers.find((e) => e.key === key);
        if (server) {
          try {
            const result = await server.post(data);

            port.postMessage({
              resType: "response",
              resData: {
                key,
                taskID,
                response: result,
              },
            });
          } catch (error) {
            console.error(error);
            port.postMessage({
              resType: "response",
              resData: {
                key,
                taskID,
                error,
              },
            });
          }
        }
        break;
      }
    }
  };

  // 当标签页关闭时清理端口
  port.onclose = () => {
    ports.delete(port);
  };

  await userStorePms;

  // 初始化服务器列表
  port.postMessage({
    resType: "update",
    resData: {
      servers: servers.toJSON(),
    },
  });
};
