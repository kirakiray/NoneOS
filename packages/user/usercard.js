// 用户将用户卡片信息保存到本地，和获取本地的用户卡片数据
import { User } from "./public-user.js";
import { get } from "/packages/fs/handle/index.js";

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

// 删除用户卡片
export const deleteUserCard = async (userID) => {
  const parDirs = await get("local/system/usercards", {
    create: "dir",
  });

  const cardFile = await parDirs.get(`${userID}.ucard`);

  if (!cardFile) {
    const err = new Error(`No corresponding user card found`);
    err.code = "notFoundCard";
    throw err;
  }

  await cardFile.remove();

  return true;
};

// 读取用户信息
export async function getUserCard(options = {}) {
  const cardsDirHandle = await get("local/system/usercards", {
    create: "dir",
  });

  if (options.id) {
    // debugger;
    const targetHandle = await cardsDirHandle.get(`${options.id}.ucard`);

    if (targetHandle) {
      let item = await targetHandle.text();
      item = JSON.parse(item);
      return new User(item.data, item.sign);
    }

    return null;
  }

  let lists = await getCards(cardsDirHandle);
  // 去重得到用户数据
  lists = new Map(lists);
  lists = Array.from(lists.values());

  return lists;
}

// 递归获取卡片
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
