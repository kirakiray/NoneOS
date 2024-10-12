import {
  generateSignKeyPair,
  getHash,
  pairToString,
  stringToPair,
  arrayBufferToBase64,
  dataToArrayBuffer,
} from "./util.js";

import { get } from "/packages/fs/handle/index.js";

// 从本地文件获取用户数据
const getUserDataFromHandle = async () => {
  let userData = await get("local/system/user/data", {
    create: "file",
  });

  userData = await userData.text();

  if (userData) {
    userData = JSON.parse(userData);
  }

  return userData || null;
};

// 从本地保存用户数据
const saveUserDataFromHandle = async (key, value) => {
  let data;
  if (key instanceof Object) {
    data = key;
  } else if (key === "name" && value) {
    data = await getUserDataFromHandle();
    data[key] = value;
  } else {
    throw new Error("Data non-compliance");
  }

  const userFileHandle = await get("local/system/user/data", {
    create: "file",
  });

  await userFileHandle.write(JSON.stringify(data));
};

// 用户重命名
export const renameUser = (newName) => {
  return saveUserDataFromHandle("name", newName);
};

// let pairData = await initUserPair();
let pairData;

// 获取自己的用户数据
export const getSelfUserInfo = async () => {
  if (!pairData) {
    pairData = initUserPair();
  }

  const { signPublic, id } = await pairData;

  const localUserData = await getUserDataFromHandle();

  return {
    userID: id,
    userName: localUserData?.name,
    backupUserName: `user-${id.slice(29, 35)}`,
    signPublic,
  };
};

// 获取包含签名的自身用户数据
export const getSelfUserCardData = async () => {
  const data = await getSelfUserInfo();

  const userData = [
    ["userID", data.userID],
    ["userName", data.userName || data.backupUserName],
    ["signPublic", data.signPublic],
    ["time", Date.now()], // 签发时间
  ];

  const signStr = await sign(userData);

  return {
    data: userData,
    sign: signStr,
  };
};

// 给数据进行签名
export async function sign(message) {
  let data = dataToArrayBuffer(message);

  const arrayData = await crypto.subtle.sign(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    (
      await pairData
    ).signPair.privateKey,
    data
  );

  return arrayBufferToBase64(arrayData);
}

// 初始化并获取自己的签名和加密用的CryptoKey
async function initUserPair() {
  let signPair;
  let signPublic;

  const localUserData = await getUserDataFromHandle();

  if (!localUserData) {
    signPair = await generateSignKeyPair();
    const signPairObj = await pairToString(signPair);

    signPublic = signPairObj.public;

    await saveUserDataFromHandle({
      signPair: signPairObj,
    });
  } else {
    const { signPair: signPairObj } = localUserData;

    signPublic = signPairObj.public;

    signPair = await stringToPair(signPairObj);
  }

  return {
    signPair,
    signPublic,
    id: await getHash(signPublic),
  };
}
