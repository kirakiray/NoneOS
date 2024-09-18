import {
  generateSignKeyPair,
  generateEncryKeyPair,
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

const pairData = await initUserPair();

// 获取自己的用户数据
export const getSelfUserInfo = async () => {
  const { signPublic, encryPublic, id } = pairData;

  const localUserData = await getUserDataFromHandle();

  return {
    userID: id,
    userName: localUserData?.name,
    backupUserName: `user-${id.slice(29, 35)}`,
    signPublic,
    encryPublic,
  };
};

// 获取包含签名的自身用户数据
export const getSelfUserCardData = async () => {
  const data = await getSelfUserInfo();

  const userData = [
    ["userID", data.userID],
    ["userName", data.userName || data.backupUserName],
    ["signPublic", data.signPublic],
    ["encryPublic", data.encryPublic],
    ["time", Date.now()], // 签发时间
  ];

  const signData = await sign(userData);

  return {
    data: userData,
    sign: signData,
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
    pairData.signPair.privateKey,
    data
  );

  return arrayBufferToBase64(arrayData);
}

// 初始化并获取自己的签名和加密用的CryptoKey
async function initUserPair() {
  let signPair, encryPair;
  let signPublic, encryPublic;

  const localUserData = await getUserDataFromHandle();

  if (!localUserData) {
    signPair = await generateSignKeyPair();
    const signPairObj = await pairToString(signPair);
    encryPair = await generateEncryKeyPair();
    const encryPairObj = await pairToString(encryPair);

    signPublic = signPairObj.public;
    encryPublic = encryPairObj.public;

    await saveUserDataFromHandle({
      signPairObj,
      encryPairObj,
    });
  } else {
    const { signPairObj, encryPairObj } = localUserData;

    signPublic = signPairObj.public;
    encryPublic = encryPairObj.public;

    signPair = await stringToPair("sign", signPairObj);
    encryPair = await stringToPair("encry", encryPairObj);
  }

  return {
    signPair,
    encryPair,
    signPublic,
    encryPublic,
    id: await getHash(signPublic),
  };
}
