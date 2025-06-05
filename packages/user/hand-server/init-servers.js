// 服务器对象采用独立映射机制：系统维护一个共享的真实servers实例，每个页面通过独立的映射对象来访问和操作这些服务器
import { Stanz } from "../../libs/stanz/main.js";
import { HandServer } from "./handserver.js";
import { getUserStore } from "../user-store.js";
import { emit } from "../event.js";
import { verifyData } from "../verify.js";
import { getHash } from "../../fs/util.js";

export const servers = new Stanz([]);

export const initServers = async (useLocalUserDirName) => {
  useLocalUserDirName = useLocalUserDirName || "main";
  const selfUserStore = await getUserStore(useLocalUserDirName);
  await selfUserStore.ready(true);

  selfUserStore.servers.forEach((serverInfo) => {
    const server = new HandServer({
      store: selfUserStore,
      url: serverInfo.url,
    });

    server._onagentdata = (fromUserId, agentData) => {
      console.log("server._onagentdata", agentData);

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

          emit("server-agent-data", {
            server,
            fromUserId,
            data: agentData.data,
            useLocalUserDirName,
            signed: true,
          });
        })();
      } else {
        emit("server-agent-data", {
          server,
          fromUserId,
          data: agentData,
          useLocalUserDirName,
          signed: false,
        });
      }
    };

    // 发起连接
    server.connect();

    servers.push(server);
  });
};
