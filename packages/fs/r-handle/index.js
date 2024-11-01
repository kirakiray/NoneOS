import { getAllCerts } from "../../core/cert/main.js";
import { getId } from "../../core/base/pair.js";
import { getUser } from "/packages/core/user-connect/main.js";
import { RemoteDirHandle } from "./dir.js";
import { bridge } from "./bridge.js";

// 获取所有可以访问的远程节点
export const getRemotes = async () => {
  const selfUserID = await getId();
  const certs = await getAllCerts();

  // 过滤到只给自己的完整授权证书
  const availableCerts = (
    await Promise.all(
      certs.map(async (e) => {
        const data = new Map(e.data);
        const authTo = data.get("authTo");

        if (authTo !== selfUserID) {
          return null;
        }

        const issuerID = data.get("issuer");

        const cards = await getUser({
          userId: issuerID,
        });

        if (cards.length) {
          const card = cards[0];

          return {
            name: new Map(card.data).get("userName"),
            userId: issuerID,
            paths: [
              {
                name: "虚拟空间",
                path: `$remote:${issuerID}:local`,
              },
              {
                name: "应用",
                path: `$remote:${issuerID}:apps`,
              },
            ],
          };
        }
      })
    )
  ).filter((e) => e);

  return availableCerts;
};

export const get = async (path) => {
  const pathArr = path.split("/");
  const rootInfo = pathArr[0].split(":");
  const userId = rootInfo[1];

  const rootHandle = new RemoteDirHandle({
    path: pathArr[0],
    bridge,
  });

  if (pathArr.length === 1) {
    return rootHandle;
  }

  const subPath = pathArr.slice(1).join("/");

  return await rootHandle.get(subPath);
};
