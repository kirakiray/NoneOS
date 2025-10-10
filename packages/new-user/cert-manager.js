export default class CertManager {
  #user;
  constructor(user) {
    this.#user = user;

    const name = this.#user.dirName;
  }

  // 使用自己的用户签名给目标用户签发证书
  async issue({ userId, role, ...data }) {
    // 对数据进行签名
    const signedData = await this.#user.sign({
      ...data,
      role,
      issuedBy: this.#user.userId,
      issuedTo: userId,
    });

    // 保存证书到数据库
    await this.save(signedData);

    return signedData;
  }

  // 查询数据库中所有符合条件的证书数据
  async query({ role, issuedBy, issuedTo }) {}

  // 获取我的对应条件的证书
  async get({ role, issuedTo }) {
    // 查询数据库中是否存在该证书
    const certs = await this.query({
      role,
      issuedBy: this.#user.userId,
      issuedTo,
    });

    return certs;
  }

  // 查询数据库中是否存在该证书
  async has({ role, issuedTo }) {
    const certs = await this.get({ role, issuedTo });

    return certs.length > 0;
  }

  // 保存证书到数据库
  async save(data) {
    // 如果不含有下面字段，则是非法的数据
    const keys = [
      "role",
      "issuedBy",
      "issuedTo",
      "publicKey",
      "signTime",
      "signature",
    ];
    if (!keys.every((key) => key in data)) {
      throw new Error(
        `数据不完整，缺少必要字段: ${keys
          .filter((key) => !(key in data))
          .join(", ")}`
      );
    }

    debugger;
  }

  // 删除数据库中存在的该证书
  async delete({ role, issuedBy, issuedTo }) {
    // 如果没有issuedBy，默认为自己的userId
    if (!issuedBy) {
      issuedBy = this.#user.userId;
    }
  }
}
