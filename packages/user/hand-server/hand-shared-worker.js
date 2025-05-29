import { Stanz } from "../../libs/stanz/main.js";
import { getUserStore } from "../user-store.js";
import { HandServer } from "./handserver.js";
// import * as ways from "./ways/index.js";

// 存储所有连接的客户端端口
const ports = new Set();

// 获取userdirname
const useLocalUserDirName = new URLSearchParams(location.search).get("userdir");

// 生成服务器对象数据
const servers = new Stanz([]);

// 初始化用户数据
const userStorePms = getUserStore(useLocalUserDirName).then(async (userStore) => {
  await userStore.ready(true);

  const initServersItem = async (e) => {
    if (e.__client) {
      return;
    }

    const client = new HandServer({
      store: userStore,
      url: e.url,
    });

    e.__client = client;

    client._onagentdata = (fromUserId, agentData) => {
      // if (agentData.way) {
      //   // 直接走way方式处理
      //   if (ways[agentData.way]) {
      //     ways[agentData.way]({
      //       fromUserId,
      //       agentData,
      //       useLocalUserDirName,
      //       userStore,
      //     });
      //   }
      // }

      // TODO: 在没有交换证书的情况下，只允许签发的请求

      ports.forEach((port) => {
        port.postMessage({
          resType: "onagentdata",
          resData: {
            key: client.key,
            fromUserId,
            agentData,
          },
        });
      });
    };

    client.connect();

    servers.push(client);
  };

  // 初始化服务器列表
  userStore.servers.forEach((e) => {
    initServersItem(e);
  });

  // 监听服务器列表变化
  userStore.servers.watchTick(() => {
    // 清理掉不存在的服务器
    const needRemoveds = servers.filter((e) => {
      return !userStore.servers.some((e2) => e2.url === e.serverUrl);
    });

    needRemoveds.forEach((e) => {
      e._ws.close();
      const index = servers.indexOf(e);
      servers.splice(index, 1);
    });

    // 初始化服务器列表
    userStore.servers.forEach(async (e) => {
      if (!e.__client) {
        await e.ready(true);
        initServersItem(e);
      }
    });
  }, 100);

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

const testId = Math.random().toString(36).slice(2);

self.onconnect = async (e) => {
  const port = e.ports[0];
  ports.add(port);

  console.log("连接成功", ports);

  setTimeout(() => {
    port.postMessage({
      resType: "ping",
      useLocalUserDirName,
      testId,
    });
  }, 1000);

  port.onmessage = async (e) => {
    const { atype, adata } = e.data;

    switch (atype) {
      case "close": {
        port.close();
        ports.delete(port);
        break;
      }
      case "ping": {
        const { key } = adata;

        const server = servers.find((e) => e.key === key);
        if (server) {
          server.ping();
        }

        break;
      }
      case "post": {
        const { key, taskID, data } = adata;
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
    resType: "init-update",
    resData: {
      servers: servers.toJSON(),
    },
  });
};
