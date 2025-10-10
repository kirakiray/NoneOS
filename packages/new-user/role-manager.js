export default class RoleManager {
  #user;
  constructor(user) {
    this.#user = user;
  }

  // 使用自己的用户签名给目标用户签发证书
  async issue({ userId, role, ...data }) {
    
  }

  // 查询数据库中是否存在该证书
  async has({ role, issuedBy, issuedTo }) {
    // 如果没有issuedBy，默认为自己的userId
    if (!issuedBy) {
      issuedBy = this.#user.userId;
    }
  }

  // 保存证书到数据库
  async save(data) {
    // 如果不含有下面字段，则是非法的数据
    const keys = ["role", "issuedBy", "issuedTo"];
    if (!keys.every((key) => key in data)) {
      throw new Error("数据不完整，缺少必要字段");
    }
  }
}
