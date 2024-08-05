const pairData = await initUserPair();

export async function createUser() {
  console.log("pairData: ", pairData);
}

export const getUserInfo = async () => {
  const { signPublic, encryPublic, id } = pairData;

  return {
    userID: id,
    userName: localStorage.__username,
    backupUserName: `user-${id.slice(29, 35)}`,
    signPublic,
    encryPublic,
  };
};

import {
  generateSignKeyPair,
  generateEncryKeyPair,
  base64ToArrayBuffer,
  getHash,
  getPairString,
  arrayBufferToBase64,
} from "./util.js";

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

  if (!localStorage.__signPair) {
    signPair = await generateSignKeyPair();
    const signPairObj = await getPairString(signPair);
    encryPair = await generateEncryKeyPair();
    const encryPairObj = await getPairString(encryPair);

    signPublic = signPairObj.public;
    encryPublic = encryPairObj.public;

    localStorage.__signPair = JSON.stringify(signPairObj);
    localStorage.__encryPair = JSON.stringify(encryPairObj);
  } else {
    const signPairObj = JSON.parse(localStorage.__signPair);
    const encryPairObj = JSON.parse(localStorage.__encryPair);

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
