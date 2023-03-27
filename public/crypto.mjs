const currentDir = new URL(".", import.meta.url).pathname;

export async function generateKeyPair() {
  if (!window.crypto || !crypto.subtle) {
    throw new Error("Web Crypto API is not available");
  }

  const algorithm = { name: "ECDSA", namedCurve: "P-256" };
  const extractable = true;
  const usages = ["sign", "verify"];

  try {
    const keyPair = await crypto.subtle.generateKey(
      algorithm,
      extractable,
      usages
    );

    const publicKeyData = await crypto.subtle.exportKey(
      "spki",
      keyPair.publicKey
    );

    const publicKey = btoa(
      String.fromCharCode.apply(null, new Uint8Array(publicKeyData))
    );

    const privateKeyData = await crypto.subtle.exportKey(
      "pkcs8",
      keyPair.privateKey
    );
    const privateKey = btoa(
      String.fromCharCode.apply(null, new Uint8Array(privateKeyData))
    );

    return { publicKey, privateKey };
  } catch (error) {
    console.error("Failed to generate a key pair", error);
    throw error;
  }
}

export function generateRandomId() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

export function calculateFileHash(data) {
  return new Promise((resolve) => {
    const worker = new Worker(`${currentDir}worker/calculateFileHash.js`);

    worker.addEventListener("message", (event) => {
      resolve(event.data);
      worker.terminate();
    });

    worker.postMessage(data);
  });
}
