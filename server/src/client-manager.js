/**
 * 客户端管理器类
 * 负责管理所有连接到服务器的客户端，包括认证、用户状态跟踪等功能
 */
import { getHash } from "../../packages/util/hash/get-hash.js";
import { verify } from "../../packages/user/util/verify.js";

export class ClientManager {
  constructor() {
    this.clients = new Map(); // cid -> client，存储所有客户端连接
    this.users = new Map(); // userId -> userData，存储认证后的用户数据
    this.followIndex = new Map(); // followedUserId -> followerUserId[]，存储用户关注关系
  }

  /**
   * 添加客户端到管理器
   * @param {Client} client - 客户端实例
   */
  addClient(client) {
    this.clients.set(client.cid, client);
  }

  /**
   * 从管理器中移除客户端
   * @param {string} cid - 客户端ID
   */
  removeClient(cid) {
    const client = this.clients.get(cid);
    if (!client) return;

    this.clients.delete(cid);

    if (client.userId) {
      this._removeUserClient(client);
    }
  }

  /**
   * 从用户池中移除客户端
   * @param {Client} client - 客户端实例
   */
  _removeUserClient(client) {
    const userData = this.users.get(client.userId);
    if (!userData) return;

    userData.userPool.delete(client);

    if (userData.userPool.size === 0) {
      this._cleanupUser(client.userId);
    }
  }

  /**
   * 清理用户数据
   * @param {string} userId - 用户ID
   */
  _cleanupUser(userId) {
    const userData = this.users.get(userId);
    if (!userData) return;

    // 清理关注关系
    const followUsers = userData.followUsers || [];
    for (const followedUserId of followUsers) {
      const followers = this.followIndex.get(followedUserId);
      if (followers) {
        const index = followers.indexOf(userId);
        if (index > -1) {
          followers.splice(index, 1);
          if (followers.length === 0) {
            this.followIndex.delete(followedUserId);
          }
        }
      }
    }

    // 通知关注者用户下线
    const followers = this.followIndex.get(userId);
    if (followers) {
      for (const followerId of followers) {
        const followerUser = this.users.get(followerId);
        if (followerUser && followerUser.userPool) {
          followerUser.userPool.forEach((userClient) => {
            userClient.send({
              type: "notify_follow",
              online: [],
              offline: [userId],
              message: "你关注的用户下线了",
            });
          });
        }
      }
    }

    this.users.delete(userId);
  }

  /**
   * 验证客户端身份
   * @param {Client} client - 客户端实例
   * @param {Object} signedData - 签名数据
   * @returns {Promise<string>} 用户ID
   */
  async authenticateClient(client, signedData) {
    if (signedData.cid !== client.cid) {
      throw new Error("cid 不匹配");
    }

    const result = await verify(signedData);

    if (!result) {
      throw new Error("签名被篡改");
    }

    const userId = await getHash(signedData.publicKey);

    client.userId = userId;
    client.publicKey = signedData.publicKey;
    client.state = "authed";
    client.userSessionId = signedData.userSessionId;
    client.userInfo = signedData.info;

    const userData = this._getOrCreateUserData(userId);
    userData.userPool.add(client);
    userData.userInfo = signedData.info;

    // 通知关注者用户上线
    const followers = this.followIndex.get(userId);
    if (followers) {
      for (const followerId of followers) {
        const followerUser = this.users.get(followerId);
        if (followerUser && followerUser.userPool) {
          followerUser.userPool.forEach((userClient) => {
            userClient.send({
              type: "notify_follow",
              online: [userId],
              offline: [],
              message: "你关注的用户上线了",
            });
          });
        }
      }
    }

    return userId;
  }

  /**
   * 获取或创建用户数据
   * @param {string} userId - 用户ID
   * @returns {Object} 用户数据对象
   */
  _getOrCreateUserData(userId) {
    let userData = this.users.get(userId);
    if (!userData) {
      userData = {
        userId,
        userPool: new Set(),
        followUsers: [],
        userInfo: null,
      };
      this.users.set(userId, userData);
    }
    return userData;
  }

  /**
   * 更新用户关注列表
   * @param {Client} client - 客户端实例
   * @param {Array} followUsers - 关注的用户ID列表
   */
  updateFollowList(client, followUsers) {
    if (followUsers.length > 32) {
      followUsers = followUsers.slice(0, 32);
    }

    const userData = this.users.get(client.userId);
    if (!userData) return;

    const oldFollowUsers = userData.followUsers || [];

    // 清理旧的反向索引
    for (const followedUserId of oldFollowUsers) {
      const followers = this.followIndex.get(followedUserId);
      if (followers) {
        const index = followers.indexOf(client.userId);
        if (index > -1) {
          followers.splice(index, 1);
          if (followers.length === 0) {
            this.followIndex.delete(followedUserId);
          }
        }
      }
    }

    // 建立新的反向索引
    for (const followedUserId of followUsers) {
      if (!this.followIndex.has(followedUserId)) {
        this.followIndex.set(followedUserId, []);
      }
      const followers = this.followIndex.get(followedUserId);
      if (!followers.includes(client.userId)) {
        followers.push(client.userId);
      }
    }

    userData.followUsers = followUsers;
  }

  /**
   * 根据用户ID获取用户数据
   * @param {string} userId - 用户ID
   * @returns {Object|undefined} 用户数据对象或undefined
   */
  getUserById(userId) {
    return this.users.get(userId);
  }

  /**
   * 根据客户端ID获取客户端实例
   * @param {string} cid - 客户端ID
   * @returns {Client|undefined} 客户端实例或undefined
   */
  getClientById(cid) {
    return this.clients.get(cid);
  }

  /**
   * 获取所有客户端实例数组
   * @returns {Array} 所有客户端实例数组
   */
  getAllClients() {
    return Array.from(this.clients.values());
  }

  /**
   * 获取所有用户数据数组
   * @returns {Array} 所有用户数据数组
   */
  getAllUsers() {
    return Array.from(this.users.values());
  }
}
