// 用户将用户卡片信息保存到本地，和获取本地的用户卡片数据
import { User } from "./public-user.js";
import get from "/packages/fs/get.js";

// 保存用户信息
export async function saveUserCard(options = {}) {
  const { dataSignature, data, source } = options;

  const userObj = new User(data, dataSignature);

  const result = await userObj.verify();

  if (!result) {
    const err = new Error("User verification failed");
    console.error(err, options);
    throw err;
  }

  // 写入到对应域名的卡片文件夹
  const userFile = await get(`local/system/usercards/${userObj.id}.ucard`, {
    create: "file",
  });

  await userFile.write(
    JSON.stringify({
      data,
      sign: dataSignature,
    })
  );

  return true;
}

// 读取用户信息
export async function getUserCard(options = {}) {
  const parDirs = await get("local/system/usercards", {
    create: "dir",
  });

  let lists = await getCards(parDirs);
  // 去重得到用户数据
  lists = new Map(lists);
  lists = Array.from(lists.values());

  return lists;
}

const getCards = async (parDirs) => {
  if (!parDirs) {
    return [];
  }

  const lists = [];

  for await (let handle of parDirs.values()) {
    if (handle.kind === "dir") {
      const subList = await getCards(handle);
      lists.push(...subList);
    } else {
      try {
        let item = await handle.text();
        item = JSON.parse(item);

        const user = new User(item.data, item.sign);

        // 通过验证后才加入
        const result = await user.verify();

        if (result) {
          lists.push([user.id, user]);
        }
      } catch (err) {
        console.error(err);
      }
    }
  }

  return lists;
};
