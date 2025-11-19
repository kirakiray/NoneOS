import { getHash } from "../../packages/util/hash/main.js";

export class ClientManager {
  constructor() {
    this.clients = new Map(); // cid -> client
    this.users = new Map();   // userId -> userData
    this.followIndex = new Map(); // followedUserId -> followerUserId[]
  }

  addClient(client) {
    this.clients.set(client.cid, client);
  }

  removeClient(cid) {
    const client = this.clients.get(cid);
    if (!client) return;

    this.clients.delete(cid);
    
    if (client.userId) {
      this._removeUserClient(client);
    }
  }

  _removeUserClient(client) {
    const userData = this.users.get(client.userId);
    if (!userData) return;

    userData.userPool.delete(client);
    
    if (userData.userPool.size === 0) {
      this._cleanupUser(client.userId);
    }
  }

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
          followerUser.userPool.forEach(userClient => {
            userClient.send({
              type: "notify_follow",
              online: [],
              offline: [userId],
              message: "你关注的用户下线了"
            });
          });
        }
      }
    }

    this.users.delete(userId);
  }

  async authenticateClient(client, signedData) {
    if (signedData.cid !== client.cid) {
      throw new Error("cid 不匹配");
    }

    const { verify } = await import("../../packages/user/util/verify.js");
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
          followerUser.userPool.forEach(userClient => {
            userClient.send({
              type: "notify_follow",
              online: [userId],
              offline: [],
              message: "你关注的用户上线了"
            });
          });
        }
      }
    }

    return userId;
  }

  _getOrCreateUserData(userId) {
    let userData = this.users.get(userId);
    if (!userData) {
      userData = {
        userId,
        userPool: new Set(),
        followUsers: [],
        userInfo: null
      };
      this.users.set(userId, userData);
    }
    return userData;
  }

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

  getUserById(userId) {
    return this.users.get(userId);
  }

  getClientById(cid) {
    return this.clients.get(cid);
  }

  getAllClients() {
    return Array.from(this.clients.values());
  }

  getAllUsers() {
    return Array.from(this.users.values());
  }
}