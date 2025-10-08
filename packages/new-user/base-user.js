import { createSingleData } from "../hybird-data/single-data.js";

import {
  generateKeyPair,
  createSigner,
  createVerifier,
} from "../crypto/crypto-ecdsa.js";

import { getHash } from "../fs/util.js";

export class BaseUser extends EventTarget {
  #dirHandle;
  #signer;
  #verifier;
  #publicKey;
  #userId;
  #_inited;

  constructor(dirHandle) {
    super();
    if (typeof dirHandle === "string") {
      this.#publicKey = dirHandle;
    } else {
      this.#dirHandle = dirHandle;
    }
  }

  get userId() {
    return this.#userId;
  }

  get publicKey() {
    return this.#publicKey;
  }

  // 初始化用户钥匙对
  async init() {
    if (!this.#dirHandle && !this.#publicKey) {
      throw new Error("用户目录句柄或公钥至少要有一个");
    }

    if (this.#_inited) {
      return this.#_inited;
    }

    this.#_inited = (async () => {
      if (this.#publicKey && !this.#dirHandle) {
        // 公钥模式
        this.#userId = await getHash(this.#publicKey);
        this.#verifier = await createVerifier(this.#publicKey);
        return;
      }

      const pariHandle = await this.#dirHandle.get("pair.json", {
        create: "file",
      });

      const pairData = await createSingleData({ handle: pariHandle });

      if (!pairData.publicKey) {
        const pair = await generateKeyPair();
        Object.assign(pairData, pair);
      }

      this.#userId = await getHash(pairData.publicKey);
      this.#publicKey = pairData.publicKey;
      this.#verifier = await createVerifier(pairData.publicKey);

      if (pairData.privateKey) {
        this.#signer = await createSigner(pairData.privateKey);
      }

      setTimeout(() => {
        // 防止保存数据，延迟清除监听
        pairData.disconnect();
      }, 1000);
    })();
  }

  get sign() {
    if (!this.#signer) {
      // 公钥模式下没有私钥，无法签名
      return null;
    }

    return this._sign;
  }

  // 签名数据
  // 拥有 privateKey 才能签名
  async _sign(data) {
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
  // 使用自身的公钥验证，会比verifyData更快
  async verify(data) {
    const { msg, signature } = data;

    // 验证数据是否存在
    if (!msg || !signature) {
      const error = new Error("Data or signature does not exist");
      console.error(error);
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
      const error = new Error("Signature format error", { cause: err });
      console.error(error);
      return false;
    }
  }

  bind(eventName, callback) {
    this.addEventListener(eventName, callback);

    return () => {
      this.removeEventListener(eventName, callback);
    };
  }
}
