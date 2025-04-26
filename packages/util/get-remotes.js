import { getDeviceStore } from "../user/device/main.js";
import { on } from "../user/event.js";
import { getConnection } from "../user/connection/main.js";
import { Stanz } from "../libs/stanz/main.js";

on("receive-user-data", async (e) => {
  const {
    useLocalUserDirName, // 目标本地用户目录名称
    fromUserId, // 消息来源用户ID
    // fromTabId, // 消息来源TabID
    tabConnection, // 消息来源TabConnection
  } = e;

  let { data } = e;
  const { kind } = data;

  if (kind === "update-roots") {
    const { dirs } = data;

    // 更新可用目录
    tabConnection._dirs = dirs;

    // 更新远程目录
    updataRemotes({ useLocalUserDirName });
  } else if (kind === "close") {
    tabConnection.close();
    // 主动关闭无法触发onconnectionstatechange事件，需要手动触发
    tabConnection.rtcConnection.dispatchEvent(
      new Event("connectionstatechange")
    );

    // 更新远程目录
    updataRemotes({ useLocalUserDirName });
  }
});

// 存储所有远程文件目录
const remotes = {};

// 更新远程文件目录
const updataRemotes = async ({ useLocalUserDirName } = {}) => {
  const selfRemotes = await getRemotes({ useLocalUserDirName });

  for (let e of selfRemotes) {
    const { userId } = e;
    const connection = await getConnection({ useLocalUserDirName, userId });
    // 从所有tabs中收集目录信息
    const dirs = connection.tabs
      .flatMap((tab) =>
        (tab._dirs || []).map((dir) => ({
          name: dir.name,
          path: `$user-${userId}:${dir.name}`,
        }))
      )
      // 使用Set去重
      .filter(
        (dir, index, self) =>
          index === self.findIndex((d) => d.path === dir.path)
      );

    e.dirs = dirs;
  }
};

// 获取所有远程文件目录
export const getRemotes = async ({ useLocalUserDirName } = {}) => {
  useLocalUserDirName = useLocalUserDirName || "main";

  if (remotes[useLocalUserDirName]) {
    return remotes[useLocalUserDirName];
  }

  // 获取已经授权的设备
  const deviceStore = await getDeviceStore(useLocalUserDirName);

  const arr = deviceStore.map((e) => {
    const userId = e.toOppoCertificate.data.authTo;
    return {
      userName: e.userCard.data.userName,
      userId,
      dirs: [
        // {
        //   name: "local",
        //   path: `$user-${userId}:local`,
        //   userId,
        // },
      ],
    };
  });

  return (remotes[useLocalUserDirName] = new Stanz(arr));
};

export default getRemotes;
