import { getDeviceStore } from "../../../user/device/main.js";
import { getConnectionStore } from "../../../user/connection/main.js";

const remotes = {};

// 获取所有远程文件目录
export const getRemotes = async ({ userDirName } = {}) => {
  userDirName = userDirName || "main";

  if (remotes[userDirName]) {
    return remotes[userDirName];
  }

  // 获取已经授权的设备
  const deviceStore = await getDeviceStore(userDirName);

  const connects = await getConnectionStore(userDirName);
  console.log("connects: ", connects);

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

  return arr;
};

export default getRemotes;
