// 用户将用户信息保存到本地

import { User } from "./public-user.js";
import get from "/packages/fs/get.js";

// 保存用户信息
export async function saveUser(options = {}) {
  const { dataSignature, data, source } = options;

  if (!source.trim()) {
    throw "no source";
  }

  const userObj = new User(data, dataSignature);

  const result = await userObj.verify();

  if (!result) {
    const err = new Error("User verification failed");
    console.error(err, options);
    throw err;
  }

  // 写入到哪步文件
  const userFile = await get(
    `local/system/usercards/${source}/${userObj.id}.ucard`,
    {
      create: "file",
    }
  );

  await userFile.write(
    JSON.stringify({
      data,
      sign: dataSignature,
    })
  );

  return true;
}

// 读取用户信息
export async function getUser(options = {}) {
  debugger;
}
