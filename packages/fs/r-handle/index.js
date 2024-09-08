import { getCerts } from "/packages/user/cert.js";
import { getSelfUserInfo } from "/packages/user/main.js";
import { getUserCard } from "/packages/user/usercard.js";
import { RemoteDirHandle } from "./dir.js";
import { handleBridge } from "./bridge.js";

// 获取可远端的根目录
export const getRemotes = async () => {
  const certs = await getCerts();
  const selfUserInfo = await getSelfUserInfo();
  const userCards = await getUserCard();

  // 授权给自己的所有权证书
  return certs
    .filter((e) => {
      return e.permission === "fully" && e.authTo === selfUserInfo.userID;
    })
    .map((certData) => {
      const card = userCards.find((user) => user.id === certData.issuer);

      return {
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
      };
    });
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
