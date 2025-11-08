export const getHash = async (data) => {
  if (!globalThis.crypto) {
    // Node.js 环境
    const crypto = await import("crypto");
    if (typeof data === "string") {
      data = new TextEncoder().encode(data);
    } else if (data instanceof Blob) {
      data = await data.arrayBuffer();
    }
    const hash = crypto.createHash("sha256");
    hash.update(Buffer.from(data));
    return hash.digest("hex");
  } else {
    // 浏览器环境
    if (typeof data === "string") {
      data = new TextEncoder().encode(data);
    } else if (data instanceof Blob) {
      data = await data.arrayBuffer();
    }
    const hash = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray
      .map((bytes) => bytes.toString(16).padStart(2, "0"))
      .join("");
    return hashHex;
  }
};
