import { createSingleData } from "../hybird-data/single-data.js";
import { generateKeyPair } from "../crypto/crypto-ecdsa.js";
import { getHash } from "../fs/util.js";

export class User {
  #dirHandle;
  #userId;
  constructor(dirHandle) {
    this.#dirHandle = dirHandle;
  }

  get userId() {
    return this.#userId;
  }

  // 初始化用户钥匙对
  async init() {
    const pariHandle = await this.#dirHandle.get("pair.json", {
      create: "file",
    });

    const pairData = await createSingleData({ handle: pariHandle });

    if (!pairData.privateKey) {
      const pair = await generateKeyPair();

      Object.assign(pairData, pair);
    }

    this.#userId = await getHash(pairData.publicKey);
  }
}
