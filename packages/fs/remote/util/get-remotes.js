import { getDeviceStore } from "../../../user/device/main.js";

// 获取所有远程文件目录
export const getRemotes = async ({ userDirName = "main" } = {}) => {
  const deviceStore = await getDeviceStore(userDirName);

  const arr = deviceStore.map((e) => {
    const userId = e.toOppoCertificate.data.authTo;
    return {
      userName: e.userCard.data.userName,
      userId,
      dirs: [
        {
          name: "local",
          path: "local",
          userId,
        },
      ],
    };
  });

  return arr;
};

export default getRemotes;
