export async function generateSignKeyPair() {
  return await crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"]
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

// 字符串转为crypto对象
export const stringToPair = async (pair) => {
  return {
    privateKey: await crypto.subtle.importKey(
      "pkcs8", // 导入的密钥类型，这里是私钥
      base64ToArrayBuffer(pair.private),
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      true,
      ["sign"]
    ),
    publicKey: await crypto.subtle.importKey(
      "spki", // 导入的密钥类型，这里是公钥
      base64ToArrayBuffer(pair.public),
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      true,
      ["verify"]
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
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["verify"] // 只需要验证权限
  );

  return await crypto.subtle.verify(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" },
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
