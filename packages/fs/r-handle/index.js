import { getCerts } from "/packages/user/cert.js";
import { getSelfUserInfo } from "/packages/user/main.js";
// import { getUserCard } from "/packages/user/usercard.js";
import { RemoteDirHandle } from "./dir.js";
import { handleBridge } from "./bridge.js";

// 获取可远端的根目录
export const getRemotes = async () => {
  const certs = await getCerts();
  const selfUserInfo = await getSelfUserInfo();
  const userCards = [];

  const remotes = [];

  // 授权给自己的所有权的非过期证书
  certs.forEach((certData) => {
    // 过期的不要
    if (certData.expire !== "never" && Date.now() > certData.expire) {
      return;
    }

    // 不是授权给我的不要
    if (certData.authTo !== selfUserInfo.userID) {
      return;
    }

    if (certData.permission === "fully") {
      const card = userCards.find((user) => user.id === certData.issuer);

      // 确保没有重复
      if (remotes.find((e) => e.userid === certData.issuer)) {
        return;
      }

      // 转换对象
      remotes.push({
        name: card?.name,
        userid: card?.id,
        paths: [
          {
            name: "虚拟空间",
            path: `$remote:${certData.issuer}:local`,
          },
          {
            name: "应用",
            path: `$remote:${certData.issuer}:apps`,
          },
        ],
      });
    }
  });

  return remotes;
};

export const get = async (path) => {
  const pathArr = path.split("/");
  const rootInfo = pathArr[0].split(":");
  const userid = rootInfo[1];
  // const rootName = rootInfo[2];

  const rootHandle = new RemoteDirHandle(pathArr[0], (options) =>
    handleBridge(options, userid)
  );

  if (pathArr.length === 1) {
    return rootHandle;
  }

  const subPath = pathArr.slice(1).join("/");

  return await rootHandle.get(subPath);
};
