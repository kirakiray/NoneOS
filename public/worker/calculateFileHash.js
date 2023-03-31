self.addEventListener("message", async (event) => {
  const hash = await calculateFileHash(event.data);
  self.postMessage(hash);
});

async function calculateHash(data) {
  let buffer;

  if (typeof data === "string") {
    const encoder = new TextEncoder();
    buffer = encoder.encode(data);
  } else if (data instanceof Blob) {
    buffer = await data.arrayBuffer();
  } else {
    throw new Error("Unsupported data type");
  }

  const algo = "SHA-256";
  const hash = await crypto.subtle.digest(algo, buffer);
  const hashArray = Array.from(new Uint8Array(hash));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}

async function calculateFileHash(data) {
  let file = data;
  const chunkSize = 256 * 1024; // 256 KB
  const hashList = [];

  if (typeof data === "string") {
    const encoder = new TextEncoder();
    file = new File([encoder.encode(data)], "temp.txt");
  }

  if (file.size <= chunkSize) {
    return await calculateHash(file);
  }

  const chunks = Math.ceil(file.size / chunkSize);
  for (let i = 0; i < chunks; i++) {
    const start = i * chunkSize;
    const end = Math.min((i + 1) * chunkSize, file.size);
    const chunk = file.slice(start, end);
    const hash = await calculateHash(chunk);
    hashList.push(hash);
  }

  const combinedHash = hashList.join("");
  return await calculateHash(combinedHash);
}
