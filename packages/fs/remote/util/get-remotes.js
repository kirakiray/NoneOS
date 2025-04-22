import { getDeviceStore } from "../../../user/device/main.js";
import { on } from "../../../user/event.js";
import { getConnection } from "../../../user/connection/main.js";
import { Stanz } from "/packages/libs/stanz/main.js";

on("receive-user-data", async (e) => {
  const {
    userDirName, // 目标本地用户目录名称
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
    updataRemotes({ userDirName });
  }
});

// 存储所有远程文件目录
const remotes = {};

// 更新远程文件目录
const updataRemotes = async ({ userDirName } = {}) => {
  const selfRemotes = await getRemotes({ userDirName });

  for (let e of selfRemotes) {
    const { userId } = e;
    const connection = await getConnection({ userDirName, userId });

    const dirs = [];

    // 遍历tabs获取dirs
    connection.tabs.forEach((tab) => {
      tab._dirs.forEach((dir) => {
        dirs.push({
          name: dir.name,
          path: `$user-${userId}:${dir.name}`,
        });
      });
    });

    if (dirs.length) {
      // 去重复
      const reDirs = [];
      dirs.forEach((e) => {
        if (!reDirs.some((e2) => e2.path === e.path)) {
          reDirs.push(e);
        }
      });

      e.dirs = reDirs;
    }
  }
};

// 获取所有远程文件目录
export const getRemotes = async ({ userDirName } = {}) => {
  userDirName = userDirName || "main";

  if (remotes[userDirName]) {
    return remotes[userDirName];
  }

  // 获取已经授权的设备
  const deviceStore = await getDeviceStore(userDirName);

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

  return (remotes[userDirName] = new Stanz(arr));
};

export default getRemotes;
