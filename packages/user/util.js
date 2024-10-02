// 生成签名用公钥和私钥
export async function generateSignKeyPair() {
  return await crypto.subtle.generateKey(
    {
      name: "RSA-PSS",
      modulusLength: 2048, //密钥长度，可以是1024, 2048, 4096，建议2048以上
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 公共指数e，一般用65537
      hash: "SHA-256", //可以是"SHA-1", "SHA-256", "SHA-384", "SHA-512"
    },
    true,
    ["sign", "verify"]
  );
}

// 生成非对称加密用公钥和私钥
export async function generateEncryKeyPair() {
  return await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048, //密钥长度，可以是1024, 2048, 4096，建议2048以上
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 公共指数e，一般用65537
      hash: "SHA-256", //可以是"SHA-1", "SHA-256", "SHA-384", "SHA-512"
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// ArrayBuffer 转 Base64 字符串
export function arrayBufferToBase64(buffer) {
  const uint8Array = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

// Base64 字符串转 ArrayBuffer
export function base64ToArrayBuffer(base64String) {
  const binaryString = atob(base64String);
  const length = binaryString.length;
  const uint8Array = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    uint8Array[i] = binaryString.charCodeAt(i);
  }
  return uint8Array.buffer;
}

export const getHash = async (data) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    dataToArrayBuffer(data).buffer
  );

  return u8ToHex(new Uint8Array(digest));
};

function u8ToHex(u8) {
  return Array.from(u8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function dataToArrayBuffer(str) {
  if (str instanceof Object) {
    str = JSON.stringify(str);
  }
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

// 将crypto对象转为字符串
export const pairToString = async (signPair) => {
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

// 字符串转为cypto对象
export const stringToPair = async (pair, type = "sign") => {
  return {
    privateKey: await crypto.subtle.importKey(
      "pkcs8", // 导入的密钥类型，这里是私钥
      base64ToArrayBuffer(pair.private),
      {
        name: type === "sign" ? "RSA-PSS" : "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      type === "sign" ? ["sign"] : ["decrypt"]
    ),
    publicKey: await crypto.subtle.importKey(
      "spki", // 导入的密钥类型，这里是公钥
      base64ToArrayBuffer(pair.public),
      {
        name: type === "sign" ? "RSA-PSS" : "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      type === "sign" ? ["verify"] : ["encrypt"]
    ),
  };
};

// 验证信息
export async function verifyMessage(message, signature, publicKey) {
  const data = dataToArrayBuffer(message);

  const realPublicKey = await crypto.subtle.importKey(
    "spki", // 导入的密钥类型，这里是公钥
    base64ToArrayBuffer(publicKey),
    {
      name: "RSA-PSS",
      hash: "SHA-256",
    },
    true,
    ["verify"] // 只需要加密权限
  );

  return await crypto.subtle.verify(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    realPublicKey,
    base64ToArrayBuffer(signature),
    data
  );
}

// 验证签名对象
export const verifyObject = (obj) => {
  const { data, sign: signData } = obj;

  const dataMap = new Map(data);

  return verifyMessage(
    JSON.stringify(data),
    signData,
    dataMap.get("signPublic")
  );
};
