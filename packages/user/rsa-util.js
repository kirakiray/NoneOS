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
    const privateKey = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

    // 将密钥转换为 base64 字符串
    const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKey)));
    const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(privateKey)));

    return {
      publicKey: publicKeyBase64,
      privateKey: privateKeyBase64,
    };
  } catch (error) {
    console.error("RSA密钥对生成失败:", error);
    throw error;
  }
}

export async function importRSAPublicKey(publicKeyBase64) {
  try {
    const binaryKey = Uint8Array.from(atob(publicKeyBase64), c => c.charCodeAt(0));
    return await crypto.subtle.importKey(
      "spki",
      binaryKey,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["encrypt"]
    );
  } catch (error) {
    console.error("RSA公钥导入失败:", error);
    throw error;
  }
}

export async function importRSAPrivateKey(privateKeyBase64) {
  try {
    const binaryKey = Uint8Array.from(atob(privateKeyBase64), c => c.charCodeAt(0));
    return await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["decrypt"]
    );
  } catch (error) {
    console.error("RSA私钥导入失败:", error);
    throw error;
  }
}

export async function encryptMessage(publicKey, message) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const encrypted = await crypto.subtle.encrypt(
      {
        name: "RSA-OAEP"
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

export async function decryptMessage(privateKey, encryptedMessage) {
  try {
    const encrypted = Uint8Array.from(atob(encryptedMessage), c => c.charCodeAt(0));
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "RSA-OAEP"
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