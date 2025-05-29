export async function generateRSAKeyPair() {
  try {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );

    // 导出公钥（格式为 spki）
    const publicKey = await crypto.subtle.exportKey("spki", keyPair.publicKey);
    // 导出私钥（格式为 pkcs8）
    const privateKey = await crypto.subtle.exportKey(
      "pkcs8",
      keyPair.privateKey
    );

    // 将密钥转换为 base64 字符串
    const publicKeyBase64 = btoa(
      String.fromCharCode(...new Uint8Array(publicKey))
    );
    const privateKeyBase64 = btoa(
      String.fromCharCode(...new Uint8Array(privateKey))
    );

    return {
      publicKey: publicKeyBase64,
      privateKey: privateKeyBase64,
    };
  } catch (error) {
    console.error("RSA密钥对生成失败:", error);
    throw error;
  }
}

// 合并导入公钥和加密消息的函数
export async function encryptMessage(publicKeyBase64, message) {
  try {
    // 导入公钥
    const binaryKey = Uint8Array.from(atob(publicKeyBase64), (c) =>
      c.charCodeAt(0)
    );
    const publicKey = await crypto.subtle.importKey(
      "spki",
      binaryKey,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["encrypt"]
    );

    // 加密消息
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const encrypted = await crypto.subtle.encrypt(
      {
        name: "RSA-OAEP",
      },
      publicKey,
      data
    );
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  } catch (error) {
    console.error("加密失败:", error);
    throw error;
  }
}

// 合并导入私钥和解密消息的函数
export async function decryptMessage(privateKeyBase64, encryptedMessage) {
  try {
    // 导入私钥
    const binaryKey = Uint8Array.from(atob(privateKeyBase64), (c) =>
      c.charCodeAt(0)
    );
    const privateKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["decrypt"]
    );

    // 解密消息
    const encrypted = Uint8Array.from(atob(encryptedMessage), (c) =>
      c.charCodeAt(0)
    );
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "RSA-OAEP",
      },
      privateKey,
      encrypted
    );
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error("解密失败:", error);
    throw error;
  }
}
