export async function generateKeyPair() {
  try {
    // 使用 Web Crypto API 生成 ECDSA 密钥对
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256", // 使用 P-256 曲线
      },
      true, // 可导出
      ["sign", "verify"] // 用途
    );

    // 导出公钥（格式为 spki）
    const publicKey = await window.crypto.subtle.exportKey(
      "spki",
      keyPair.publicKey
    );

    // 导出私钥（格式为 pkcs8）
    const privateKey = await window.crypto.subtle.exportKey(
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
    console.error("密钥对生成失败:", error);
    throw error;
  }
}

export async function importPrivateKey(privateKeyBase64) {
  try {
    // 将 base64 转回二进制格式
    const binaryKey = Uint8Array.from(atob(privateKeyBase64), (c) =>
      c.charCodeAt(0)
    );

    // 导入私钥
    const privateKey = await window.crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      true,
      ["sign"]
    );

    return privateKey;
  } catch (error) {
    console.error("私钥导入失败:", error);
    throw error;
  }
}

export async function importPublicKey(publicKeyBase64) {
  try {
    // 将 base64 转回二进制格式
    const binaryKey = Uint8Array.from(atob(publicKeyBase64), (c) =>
      c.charCodeAt(0)
    );

    // 导入公钥
    const publicKey = await window.crypto.subtle.importKey(
      "spki",
      binaryKey,
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      true,
      ["verify"]
    );

    return publicKey;
  } catch (error) {
    console.error("公钥导入失败:", error);
    throw error;
  }
}
