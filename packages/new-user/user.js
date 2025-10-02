import { createSingleData } from "../hybird-data/single-data.js";
import {
  generateKeyPair,
  createSigner,
  createVerifier,
} from "../crypto/crypto-ecdsa.js";
import { getHash } from "../fs/util.js";

export class User {
  #dirHandle;
  #userId;
  #signer;
  #verifier;
  #publicKey;

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

    if (!pairData.publicKey) {
      const pair = await generateKeyPair();
      Object.assign(pairData, pair);
    }

    this.#publicKey = pairData.publicKey;
    this.#userId = await getHash(pairData.publicKey);

    // 创建签名器和验证器
    this.#signer = await createSigner(pairData.privateKey);
    this.#verifier = await createVerifier(pairData.publicKey);
  }

  // 签名数据
  // 拥有 privateKey 才能签名
  async sign(data) {
    if (!this.#signer) {
      throw new Error("用户没有私钥，无法签名");
    }

    const msg = JSON.stringify({
      ...data,
      signTime: Date.now(),
      publicKey: this.#publicKey,
    });

    // 签名数据
    const signature = await this.#signer(msg);

    return {
      msg,
      signature: btoa(String.fromCharCode(...new Uint8Array(signature))),
    };
  }

  // 验证数据是否正确
  async verify(data) {
    const { msg, signature } = data;

    // 验证数据是否存在
    if (!msg || !signature) {
      console.log("数据或签名不存在");
      return false;
    }

    try {
      const signatureBuffer = new Uint8Array(
        [...atob(signature)].map((c) => c.charCodeAt(0))
      ).buffer;

      // 验证数据
      const isValid = await this.#verifier(msg, signatureBuffer);

      return isValid;
    } catch (err) {
      console.log("签名格式错误", err);
      return false;
    }
  }
}
