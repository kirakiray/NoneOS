import {
  generateSignKeyPair,
  generateEncryKeyPair,
  base64ToArrayBuffer,
  getHash,
  getPairString,
  arrayBufferToBase64,
} from "./util.js";

import get from "../../fs/get.js";

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

// 获取包含签名的用户数据
export const getSelfUserCardData = async () => {
  const data = await getSelfUserInfo();

  const userData = [
    ["userID", data.userID],
    ["userName", data.userName || data.backupUserName],
    ["signPublic", data.signPublic],
    ["encryPublic", data.encryPublic],
    ["time", Date.now()], // 签发时间
  ];

  const signData = await sign(JSON.stringify(userData));

  return {
    data: userData,
    sign: signData,
  };
};

// 给数据进行签名
export async function sign(message) {
  let data;
  const encoder = new TextEncoder();
  data = encoder.encode(message);

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

// 初始化并获取签名和加密用的CryptoKey
async function initUserPair() {
  let signPair, encryPair;
  let signPublic, encryPublic;

  const localUserData = await getUserDataFromHandle();

  if (!localUserData) {
    signPair = await generateSignKeyPair();
    const signPairObj = await getPairString(signPair);
    encryPair = await generateEncryKeyPair();
    const encryPairObj = await getPairString(encryPair);

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

    signPair = {
      privateKey: await crypto.subtle.importKey(
        "pkcs8", // 导入的密钥类型，这里是私钥
        base64ToArrayBuffer(signPairObj.private),
        {
          name: "RSA-PSS",
          hash: "SHA-256",
        },
        true,
        ["sign"]
      ),
      publicKey: await crypto.subtle.importKey(
        "spki", // 导入的密钥类型，这里是公钥
        base64ToArrayBuffer(signPairObj.public),
        {
          name: "RSA-PSS",
          hash: "SHA-256",
        },
        true,
        ["verify"] // 只需要加密权限
      ),
    };

    encryPair = {
      privateKey: await crypto.subtle.importKey(
        "pkcs8", // 导入的密钥类型，这里是私钥
        base64ToArrayBuffer(encryPairObj.private),
        {
          name: "RSA-OAEP",
          hash: "SHA-256",
        },
        true,
        ["decrypt"]
      ),
      publicKey: await crypto.subtle.importKey(
        "spki", // 导入的密钥类型，这里是公钥
        base64ToArrayBuffer(encryPairObj.public),
        {
          name: "RSA-OAEP",
          hash: "SHA-256",
        },
        true,
        ["encrypt"] // 只需要加密权限
      ),
    };
  }

  return {
    signPair,
    encryPair,
    signPublic,
    encryPublic,
    id: await getHash(signPublic),
  };
}
