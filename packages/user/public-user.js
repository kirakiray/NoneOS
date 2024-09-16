import { verifyMessage, getHash } from "./util.js";

export class User {
  #data;
  #dataSignature;
  constructor(data, dataSignature) {
    this.#data = data;
    this.#dataSignature = dataSignature;
  }

  get id() {
    return this.#data.find((e) => e[0] === "userID")[1];
  }

  get name() {
    return this.#data.find((e) => e[0] === "userName")[1];
  }

  get(name) {
    return this.#data.find((e) => e[0] === name)[1];
  }

  get data() {
    return this.#data;
  }

  get dataSignature() {
    return this.#dataSignature;
  }

  // 验证自身信息
  async verify() {
    const data = this.#data;

    const signPublic = data.find((e) => e[0] === "signPublic")[1];
    const userID = data.find((e) => e[0] === "userID")[1];

    // 验证id没问题
    const userIdOK = (await getHash(signPublic)) === userID;

    if (!userIdOK) {
      throw new Error(`Verification userID failed`);
    }

    // 验证签名没问题
    const result = await verifyMessage(
      JSON.stringify(data),
      this.#dataSignature,
      signPublic
    );

    if (!result) {
      throw new Error("Signature verification failed");
    }

    return true;
  }
}