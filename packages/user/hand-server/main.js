import { Stanz } from "../../libs/stanz/main.js";
import { getUserStore } from "../user-store.js";
import { emit } from "../event.js";
import { verifyData } from "../verify.js";
import { getHash } from "../../fs/util.js";

// 获取服务器列表
export const getServers = async (useLocalUserDirName) => {
  useLocalUserDirName = useLocalUserDirName || "main";
  const selfUserStore = await getUserStore(useLocalUserDirName);
  await selfUserStore.ready(true);

  // 初始化服务器列表
  if (!selfUserStore.servers || selfUserStore.servers.length === 0) {
    selfUserStore.servers = [];
    if (location.host.includes("localhost")) {
      await selfUserStore.servers.ready();

      // 加入测试地址
      selfUserStore.servers.push({
        url: "ws://localhost:5579/",
      });
      selfUserStore.servers.push({
        url: "ws://localhost:5589/",
      });

      await selfUserStore.servers.ready(true);
    } else {
      // TODO: 加入官方推荐的地址
      debugger;
    }

    // 等待300ms，确保数据同步完成
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  if (selfUserStore.__handservers) {
    return selfUserStore.__handservers;
  }

  selfUserStore.__handservers = new Promise((resolve, reject) => {
    const handServers = new Stanz([]);

    const handWorker = (selfUserStore.__handWorker = new SharedWorker(
      new URL(
        "./hand-shared-worker.js?userdir=" + useLocalUserDirName,
        import.meta.url
      ),
      {
        name: "hand-worker-" + useLocalUserDirName,
        type: "module",
      }
    ));

    const cachedTasks = new Map();

    handWorker.port.onmessage = (e) => {
      const { resType, resData } = e.data;
      switch (resType) {
        case "ping": {
          console.log("ping", e.data);
          break;
        }
        case "init-update":
        case "update": {
          const { servers } = resData;
          mergeServers(handServers, servers); // 使用新函数
          initFakeMethods(handServers, handWorker, cachedTasks);
          // console.log("服务器列表初始化", servers);
          if (resType === "init-update") {
            resolve(handServers);
          }
          break;
        }
        case "response": {
          const { response, taskID, error } = resData;
          const task = cachedTasks.get(taskID);

          if (task) {
            if (error) {
              task.reject(error);
            } else {
              task.resolve(response);
            }

            cachedTasks.delete(taskID);
          }
          break;
        }
        case "onagentdata": {
          const { key, fromUserId, agentData } = resData;
          const server = handServers.find((s) => s.key === key);

          if (agentData.signature) {
            // 签名的数据，需要验证
            (async () => {
              const verResult = await verifyData(agentData);

              if (!verResult) {
                console.error("验证数据失败，数据被篡改", agentData);
                return;
              }

              const signUserId = await getHash(agentData.data.publicKey);

              // 验证来源是否正确
              if (fromUserId !== signUserId) {
                console.error(
                  `签名验证失败：发送者ID(${fromUserId})与签名者ID(${signUserId})不匹配`,
                  agentData
                );
                return;
              }

              if (server && server._onagentdata) {
                server._onagentdata(fromUserId, agentData.data);
              }

              emit("server-agent-data", {
                server,
                fromUserId,
                data: agentData.data,
                useLocalUserDirName,
                signed: true,
              });
            })();
          } else {
            if (server && server._onagentdata) {
              server._onagentdata(fromUserId, agentData);
            }

            emit("server-agent-data", {
              server,
              fromUserId,
              data: agentData,
              useLocalUserDirName,
              signed: false,
            });
          }

          break;
        }
      }
    };

    // 标签关闭时，发送关闭消息
    window.addEventListener("beforeunload", () => {
      handWorker.port.postMessage({
        agentType: "close",
      });
    });
  });

  return selfUserStore.__handservers;
};

// 添加服务器
export const addServer = async (url, useLocalUserDirName) => {
  const selfUserStore = await getUserStore(useLocalUserDirName);

  selfUserStore.servers.push({
    url,
  });
};

// 删除服务器
export const removeServer = async (url, useLocalUserDirName) => {
  const selfUserStore = await getUserStore(useLocalUserDirName);

  const targetIndex = selfUserStore.servers.findIndex(
    (server) => server.url === url
  );

  if (targetIndex !== -1) {
    selfUserStore.servers.splice(targetIndex, 1); // 移除服务器
  }
};

// 给每个对象加上伪装的方法
const initFakeMethods = (servers, handWorker, cachedTasks) => {
  servers.forEach((server) => {
    if (!server.post) {
      Object.defineProperties(server, {
        post: {
          async value(data) {
            const taskID = Math.random().toString(36).slice(2);

            const obj = {};
            const pms = new Promise((resolve, reject) => {
              obj.resolve = resolve;
              obj.reject = reject;
            });

            cachedTasks.set(taskID, obj);

            handWorker.port.postMessage({
              atype: "post",
              adata: {
                key: server.key,
                taskID,
                data,
              },
            });

            const result = await pms;

            return result;
          },
        },
        ping: {
          value() {
            handWorker.port.postMessage({
              atype: "ping",
              adata: { key: server.key },
            });
          },
        },
      });
    }
  });
};

// 新增合并服务器函数
const mergeServers = (target, source) => {
  const currentKeys = new Set(target.map((s) => s.key));
  const newKeys = new Set(source.map((s) => s.key));

  // 添加新服务器（保持响应式特性）
  source.forEach((server) => {
    if (!currentKeys.has(server.key)) {
      target.push(server);
    }
  });

  // 更新现有服务器数据
  source.forEach((server) => {
    const current = target.find((s) => s.key === server.key);
    current && Object.assign(current, server);
  });

  // 获取不存在的key
  const removedKeys = Array.from(currentKeys).filter(
    (key) => !newKeys.has(key)
  );
  // 移除不存在的服务器（保持响应式特性）
  removedKeys.forEach((key) => {
    const index = target.findIndex((s) => s.key === key);
    if (index !== -1) {
      target.splice(index, 1);
    }
  });
};
