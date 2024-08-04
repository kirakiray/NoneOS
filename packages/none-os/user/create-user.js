import {
  generateSignKeyPair,
  generateEncryKeyPair,
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from "./util.js";

export async function createUser() {
  const pairData = await getUserPair();

  console.log("pairData: ", pairData);
}

// 获取签名和加密用的CryptoKey
const getUserPair = async () => {
  let signPair, encryPair;

  if (!localStorage.__signPair) {
    signPair = await generateSignKeyPair();
    const signPairObj = await getPairString(signPair);
    encryPair = await generateEncryKeyPair();
    const encryPairObj = await getPairString(encryPair);

    localStorage.__signPair = JSON.stringify(signPairObj);
    localStorage.__encryPair = JSON.stringify(encryPairObj);
  } else {
    const signPairObj = JSON.parse(localStorage.__signPair);
    const encryPairObj = JSON.parse(localStorage.__encryPair);

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
  };
};

const getPairString = async (signPair) => {
  const signPublicArray = await crypto.subtle.exportKey(
    "spki",
    signPair.publicKey
  );
  const signPrivateArray = await crypto.subtle.exportKey(
    "pkcs8",
    signPair.privateKey
  );

  return {
    public: arrayBufferToBase64(signPublicArray),
    private: arrayBufferToBase64(signPrivateArray),
  };
};
