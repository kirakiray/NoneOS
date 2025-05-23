import { WebSocketServer } from 'ws';
import { readFile } from 'node:fs/promises';

/**
 * @file util.js
 * @author yao
 * 传入一个数据，计算哈希值
 * @param {ArrayBuffer|Blob|String} data 数据
 * @return {Promise<string>} 哈希值
 */
const getHash = async (data) => {
  if (!globalThis.crypto) {
    // Node.js 环境
    const crypto = await import('crypto');
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

async function importPublicKey(publicKeyBase64) {
  try {
    // 将 base64 转回二进制格式
    const binaryKey = Uint8Array.from(atob(publicKeyBase64), (c) =>
      c.charCodeAt(0)
    );

    // 导入公钥
    const publicKey = await crypto.subtle.importKey(
      "spki",
      binaryKey,
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      true,
      ["verify"]
    );

    return publicKey;
  } catch (error) {
    console.error("公钥导入失败:", error);
    throw error;
  }
}

const createVerifier = async (publicKeyBase64) => {
  try {
    const publicKey = await importPublicKey(publicKeyBase64);
    return (message, signature) => {
      const encoder = new TextEncoder();
      // 将消息转换为 Uint8Array
      const data = encoder.encode(message);
      // 使用公钥验证签名
      return crypto.subtle.verify(
        {
          name: "ECDSA",
          hash: { name: "SHA-256" },
        },
        publicKey,
        signature,
        data
      );
    };
  } catch (error) {
    console.error("创建验证函数失败:", error);
    throw error;
  }
};

// 验证数据
const verifyData = async ({ data, signature }) => {
  const { publicKey } = data;

  // 生成验证器
  const verify = await createVerifier(publicKey);

  try {
    // 将 base64 转换回原始格式并验证签名
    const signatureBuffer = new Uint8Array(
      [...atob(signature)].map((c) => c.charCodeAt(0))
    ).buffer;

    const result = await verify(JSON.stringify(data), signatureBuffer);

    return result;
  } catch (err) {
    // 抛出错误信息
    console.error(err);
    return false;
  }
};

const auth = async (
  parsedMessage,
  client,
  { serverOptions, serverVersion }
) => {
  // 验证用户身份
  const result = await verifyData(parsedMessage.authedData);
  const { data } = parsedMessage.authedData;
  const { publicKey, time: accountCreationTime } =
    parsedMessage.authedData.data;

  // 验证签名
  if (!result) {
    console.log("身份验证失败：签名无效");
    client.closeConnection();
    return;
  }

  // 验证会话标识符
  if (data.markid !== client.sessionId) {
    console.log("身份验证失败：会话标识符不匹配");
    client.closeConnection();
    return;
  }

  client.userInfo = data;
  client.authedData = parsedMessage.authedData;

  // 验证成功，清除超时计时器
  clearTimeout(client._authenticationTimer);

  // 生成用户ID并存储用户信息
  const userId = await getHash(publicKey);
  client._userId = userId;

  // 判断用户是否已认证
  if (authenticatedUsers.has(userId)) {
    // 已存在就删除旧的
    const old = authenticatedUsers.get(userId);
    old.client.closeConnection();
  }

  authenticatedUsers.set(userId, {
    client,
    publicKey,
    authedTime: Date.now(),
  });

  // 发送服务器信息
  client.sendMessage({
    type: "update-server-info",
    data: {
      serverName: serverOptions.name,
      serverVersion,
    },
  });

  // 发送认证成功响应
  return {
    type: "authed",
  };
};

// 获取所有用户信息，管理员专用

const mapAuthenticatedUser = ([userid, e]) => ({
  sessionId: e.client.sessionId,
  userInfo: e.client.userInfo,
  userId: e.client._userId,
  __inviteCode: e.client.__inviteCode,
});

const mapUnauthenticatedUser = (client) => ({
  sessionId: client.sessionId,
});

var getAll = {
  admin: true,
  handler: async () => {
    const authenticateds =
      Array.from(authenticatedUsers).map(mapAuthenticatedUser);
    const unauthenticateds = Array.from(activeConnections)
      .filter((e) => !e._userId)
      .map(mapUnauthenticatedUser);

    return {
      unauthenticateds,
      authenticateds,
    };
  },
};

var findFriend = {
  handler: async (requestBody, client) => {
    const { friendId } = requestBody;
    const friendData = authenticatedUsers.get(friendId);

    if (!friendData) {
      throw new Error("用户不在线");
    }

    return {
      authedTime: friendData.authedTime,
      // 返回数据让用户验证
      authedData: friendData.client.authedData,
    };
  },
};

// 存储代理数据的Map
const agentTaskPool = new Map();

// 默认超时时间（毫秒）
const DEFAULT_TIMEOUT = 5000;

var agentData = {
  handler: async (requestBody, client) => {
    const {
      friendId: targetUserId,
      data,
      timeout = DEFAULT_TIMEOUT,
    } = requestBody;

    if (!targetUserId) {
      throw new Error("缺少 friendId");
    }

    if (!data) {
      throw new Error("没有要转发的数据");
    }

    // 生成唯一的代理任务ID
    const agentTaskId = `agent_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;

    // 检查目标用户是否存在且在线
    const targetUser = authenticatedUsers.get(targetUserId);
    if (!targetUser) {
      throw new Error(`目标用户(${targetUserId})不在线`);
    }

    try {
      // 转发数据到目标用户
      targetUser.client.sendMessage({
        type: "agent-data",
        fromUserId: client._userId,
        agentTaskId,
        data,
      });

      const agentResponse = await Promise.race([
        new Promise((resolve, reject) => {
          const taskPromiseHandlers = { resolve, reject };
          agentTaskPool.set(agentTaskId, taskPromiseHandlers);
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("转发数据超时")), timeout)
        ),
      ]);

      return {
        code: 200,
        success: true,
        msg: "数据已成功转发",
        result: agentResponse,
      };
    } catch (error) {
      throw error;
    } finally {
      agentTaskPool.delete(agentTaskId);
    }
  },
};

var confirmAgent = {
  handler: async (requestBody, client) => {
    const { agentTaskId } = requestBody;

    if (!agentTaskId) {
      throw new Error("缺少agentTaskId参数");
    }

    const taskPromiseHandlers = agentTaskPool.get(agentTaskId);
    if (!taskPromiseHandlers) {
      throw new Error(`未找到对应的转发任务: ${agentTaskId}`);
    }

    try {
      taskPromiseHandlers.resolve({
        confirmedBy: client._userId,
        confirmedAt: Date.now()
      });
      return { success: true };
    } catch (error) {
      throw new Error(`确认转发失败: ${error.message}`);
    }
  },
};

// 邀请码对应的用户
const invites = new Map();

var inviteCode = {
  handler: async (requestBody, client) => {
    if (requestBody.setInviteCode) {
      if (client.__inviteCode && invites.get(client.__inviteCode) === client) {
        // 已经设置过邀请码，删除旧的
        invites.delete(client.__inviteCode);
      }

      const inviteCode = requestBody.setInviteCode;

      if (invites.get(inviteCode)) {
        throw new Error("邀请码已被使用: " + inviteCode);
      }

      const code = (client.__inviteCode = inviteCode);

      invites.set(code, client);

      // 监听删除
      client._webSocket.on("close", () => {
        if (invites.get(code) === client) {
          invites.delete(code);
        }
      });

      return {
        setInviteCode: true,
        id: client._userId,
      };
    }

    if (requestBody.setInviteCode === 0) {
      // 清空邀请码
      if (client.__inviteCode && invites.get(client.__inviteCode) === client) {
        // 已经设置过邀请码，删除旧的
        invites.delete(client.__inviteCode);
        client.__inviteCode = undefined;
      }
    }

    if (requestBody.findInviteCode) {
      const inviteCode = requestBody.findInviteCode;
      const inviteClient = invites.get(inviteCode);
      if (!inviteClient) {
        throw new Error("邀请码不存在");
      }
      return {
        findInviteCode: true,
        id: inviteClient._userId,
        authedData: inviteClient.authedData,
      };
    }

    // client.__inviteCode = requestBody.inviteCode;

    return null;
  },
};

var postHandlers = /*#__PURE__*/Object.freeze({
  __proto__: null,
  agentData: agentData,
  confirmAgent: confirmAgent,
  findFriend: findFriend,
  getAll: getAll,
  inviteCode: inviteCode
});

const createResponse = (taskId, success, data) => ({
  type: "post-response",
  taskId,
  success,
  data,
});

const errorResponse = (taskId, message) => 
  createResponse(taskId, 0, { msg: message });

const successResponse = (taskId, data) =>
  createResponse(taskId, 1, data);

const post = async (
  { taskId, data },
  client,
  { serverOptions, ...otherOptions }
) => {
  const { type } = data;
  const realType = toCamelCase(type);

  const handler = postHandlers[realType];
  if (!handler) {
    return errorResponse(taskId, "未知的post请求类型");
  }

  const { handler: handlerFn, admin } = handler;
 
  if (admin && !(await checkAdminPermission(client, serverOptions))) {
    return errorResponse(
      taskId,
      serverOptions?.admin ? "您不是管理员" : "未配置管理员"
    );
  }

  try {
    const respData = await handlerFn(data, client, {
      serverOptions,
      ...otherOptions,
    });
    return successResponse(taskId, respData);
  } catch (error) {
    console.error(`Handler ${realType} error:`, error);
    return errorResponse(taskId, error.message || "处理请求时发生错误");
  }
};

const checkAdminPermission = async (client, serverOptions) => {
  if (!serverOptions?.admin) return false;
  return serverOptions.admin.includes(client._userId);
};

function toCamelCase(str) {
  return str.replace(/-(\w)/g, (_, letter) => letter.toUpperCase());
}

var handlers = /*#__PURE__*/Object.freeze({
  __proto__: null,
  auth: auth,
  post: post
});

// 全局连接管理
const activeConnections = new Set(); // 存储所有活动的WebSocket连接
const authenticatedUsers = new Map(); // 存储已认证用户的信息
const packageJson = JSON.parse(
  await readFile(new URL("./package.json", import.meta.url))
);

const serverVersion = packageJson.version;

class ServerHandClient {
  constructor(webSocket, { serverOptions } = {}) {
    this._webSocket = webSocket; // WebSocket连接
    this._userId = null; // 用户ID
    this._serverName = serverOptions.name || "unknown server"; // 服务器名称
    this.userInfo = {}; // 存储用户信息
    this.authedData = null; // 验证用的数据

    // 生成唯一的会话标识符
    this.sessionId = Math.random().toString(36).slice(2);

    // 设置认证超时处理（5秒内必须完成认证）
    this._authenticationTimer = setTimeout(() => {
      this._webSocket.close();
    }, 5000);

    activeConnections.add(this);

    // 发送初始化消息，包含会话标识符
    this.sendMessage({
      type: "init",
      mark: this.sessionId,
    });

    // 处理接收到的消息
    webSocket.on("message", async (message) => {
      console.log("接收到客户端消息:", message.toString());

      let parsedMessage;
      try {
        parsedMessage = JSON.parse(message.toString());
      } catch (error) {
        console.log("消息格式错误：非JSON格式");
        return;
      }

      if (handlers[parsedMessage.type]) {
        try {
          const redata = await handlers[parsedMessage.type](
            parsedMessage,
            this,
            { serverOptions, serverVersion }
          );

          // 发送认证成功响应
          this.sendMessage(redata);
        } catch (error) {
          // 处理错误并发送错误响应给客户端
          console.error("处理消息时发生错误:", error);
          this.sendMessage({
            type: "error",
            error: error.message || "处理请求时发生错误",
          });
        }
        return;
      }

      if (parsedMessage.type === "ping") {
        this.sendMessage({
          type: "pong",
        });
        return;
      }

      // 没有找到对应的消息处理函数
      console.error("未找到对应的消息处理函数", parsedMessage);
    });

    // 处理连接关闭
    webSocket.on("close", () => {
      this.cleanup();
      console.log("客户端连接已关闭");
    });

    // 处理错误
    webSocket.on("error", (error) => {
      this.cleanup();
      console.log("WebSocket错误:", error);
    });
  }

  // 发送消息到客户端
  sendMessage(data) {
    this._webSocket.send(JSON.stringify(data));
  }

  // 关闭连接
  closeConnection() {
    this._webSocket.close();
  }

  // 清理连接资源
  cleanup() {
    activeConnections.delete(this);
    // 确认是这个对象才进行删除，避免删除其他对象的用户信息
    const exitedItem = authenticatedUsers.get(this._userId);
    if (this._userId && exitedItem && exitedItem.client === this) {
      authenticatedUsers.delete(this._userId);
    }
  }
}

const initServer = async (options = {}) => {
  const wss = new WebSocketServer({ port: options.port });

  wss.on("connection", function connection(ws) {
    const client = new ServerHandClient(ws, {
      serverOptions: options,
    });

    console.log("新的客户端连接", client);
  });

  console.log("WebSocket 服务器运行在 ws://localhost:" + options.port + "/");

  return wss;
};

export { initServer };
//# sourceMappingURL=dist.js.map
