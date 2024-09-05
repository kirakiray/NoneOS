import { getCerts } from "/packages/none-os/user/cert.js";
import { getSelfUserInfo } from "/packages/none-os/user/main.js";
import { getUserCard } from "/packages/none-os/user/usercard.js";

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
