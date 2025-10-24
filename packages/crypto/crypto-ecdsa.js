/**
 * ECDSA 签名相关工具函数
 */

/**
 * 生成 ECDSA 密钥对
 * @returns {Promise<{publicKey: string, privateKey: string}>} 包含公钥和私钥的 base64 字符串
 */
export async function generateKeyPair() {
  try {
    // 使用 Web Crypto API 生成 ECDSA 密钥对
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256", // 使用 P-256 曲线
      },
      true, // 可导出
      ["sign", "verify"] // 用途
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
    console.error("密钥对生成失败:", error);
    throw error;
  }
}

/**
 * 导入私钥
 * @param {string} privateKeyBase64 - base64 编码的私钥
 * @returns {Promise<CryptoKey>} CryptoKey 对象
 */
export async function importPrivateKey(privateKeyBase64) {
  try {
    // 将 base64 转回二进制格式
    const binaryKey = Uint8Array.from(atob(privateKeyBase64), (c) =>
      c.charCodeAt(0)
    );

    // 导入私钥
    const privateKey = await crypto.subtle.importKey(
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

/**
 * 导入公钥
 * @param {string} publicKeyBase64 - base64 编码的公钥
 * @returns {Promise<CryptoKey>} CryptoKey 对象
 */
export async function importPublicKey(publicKeyBase64) {
  try {
    // 将 base64 转回二进制格式
    const binaryKey = Uint8Array.from(atob(publicKeyBase64), (c) =>
      c.charCodeAt(0)
    );

    // 导入公钥
    const publicKey = await crypto.subtle.importKey(
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

/**
 * 创建签名函数
 * @param {string} privateKeyBase64 - base64 编码的私钥
 * @returns {Promise<Function>} 签名函数
 */
export const createSigner = async (privateKeyBase64) => {
  try {
    const privateKey = await importPrivateKey(privateKeyBase64);

    return (message) => {
      const encoder = new TextEncoder();
      // 将消息转换为 Uint8Array
      const data = encoder.encode(message);

      // 使用私钥对数据进行签名
      return crypto.subtle.sign(
        {
          name: "ECDSA",
          hash: { name: "SHA-256" },
        },
        privateKey,
        data
      );
    };
  } catch (error) {
    console.error("创建签名函数失败:", error);
    throw error;
  }
};

/**
 * 创建验证函数
 * @param {string} publicKeyBase64 - base64 编码的公钥
 * @returns {Promise<Function>} 验证函数
 */
export const createVerifier = async (publicKeyBase64) => {
  try {
    const publicKey = await importPublicKey(publicKeyBase64);
    return (message, signature) => {
      const encoder = new TextEncoder();
      // 将消息转换为 Uint8Array
      const data = encoder.encode(message);
      // 使用公钥验证签名
      return crypto.subtle.verify(
        {
          name: "ECDSA",
          hash: { name: "SHA-256" },
        },
        publicKey,
        signature,
        data
      );
    };
  } catch (error) {
    console.error("创建验证函数失败:", error);
    throw error;
  }
};