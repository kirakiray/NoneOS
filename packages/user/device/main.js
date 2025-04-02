import { createData } from "/packages/hybird-data/main.js";
import { get } from "/packages/fs/main.js";
import { getServers } from "../hand-server/main.js";
import { on } from "../event.js";
import { verifyData } from "../verify.js";
import { getHash } from "/packages/fs/util.js";
import { signData } from "../sign.js";
import { getMyCardData } from "../card/main.js";
import { getUserStore } from "../user-store.js";

const stores = {};

// 获取所有设备列表
export const getDeviceStore = async (userDirName) => {
  userDirName = userDirName || "main";

  const devicesDir = await get(`system/devices/${userDirName}`, {
    create: "dir",
  });

  let deviceStorePms = null;
  if (!stores[userDirName]) {
    deviceStorePms = stores[userDirName] = createData(devicesDir);
  } else {
    deviceStorePms = stores[userDirName];
  }

  const deviceStore = await deviceStorePms;

  // 等待数据准备好
  await deviceStore.ready(true);

  return deviceStore;
};

// 添加设备
// deviceCode 设备码
// confirm 确认信息
// userDirName 当前用户目录
export const findDevice = async (deviceCode, userDirName) => {
  // 前从服务器查找用户
  const servers = await getServers(userDirName);

  // 等待服务器准备完成
  await servers.watchUntil(() => servers.every((server) => server.initialized));

  // 查找用户
  const oppoUsers = [];
  await Promise.all(
    servers.map(async (server) => {
      if (server.connectionState !== "connected") {
        return;
      }
      try {
        const res = await server.post({
          type: "invite-code",
          findInviteCode: deviceCode,
        });

        if (res.findInviteCode) {
          // 查找到用户了
          const { authedData } = res;

          oppoUsers.push({
            serverName: server.serverName,
            serverUrl: server.serverUrl,
            authedData,
          });
        }
      } catch (e) {
        console.log(e);
      }
    })
  );

  // 将相同的用户合并，并保留服务器地址和名称
  const mergedUsers = [];

  for (let item of oppoUsers) {
    const result = await verifyData(item.authedData);
    if (!result) {
      // 验证失败
      continue;
    }

    // 获取用户id
    const userId = await getHash(item.authedData.data.publicKey);

    // 查找是否已经存在
    const existUser = mergedUsers.find((user) => user.userId === userId);
    if (existUser) {
      // 已经存在
      existUser.serversData.push({
        serverName: item.serverName,
        serverUrl: item.serverUrl,
      });
      continue;
    }

    mergedUsers.push({
      userId,
      userName: item.authedData.data.userName,
      serversData: [
        {
          serverName: item.serverName,
          serverUrl: item.serverUrl,
        },
      ],
    });
  }

  return mergedUsers;
};

const tasks = new Map();

// 授权用户
export const authDevice = async (
  {
    verifyCode, // 验证码
    userId, // 用户id
    expire, // 证书有效期
    servers: serversUrl, // 服务器地址
    waitingTime = 1000 * 60, // 等待用户响应的时间，默认1分钟
  },
  userDirName
) => {
  // 给目标用户签发证书
  const certificate = await signData(
    {
      authTo: userId, // 授权给目标用户
      permission: "Fully", // 完全的授权，代表是本人设备
      expire: expire || Date.now() + 1000 * 60 * 60 * 24 * 30, // 30天有效期
    },
    userDirName
  );

  // 查找用户所在的服务器
  const servers = await getServers(userDirName);

  // 当前任务id
  const taskId = Math.random().toString(36).slice(2);

  let resolve, reject;
  const prms = new Promise((res, rej) => {
    resolve = (data) => {
      clearTimeout(rejectTimer);
      tasks.delete(taskId);
      res(data);
    };
    reject = rej;
  });

  let rejectTimer;

  // 向目标发送数据
  for (let url of serversUrl) {
    const targetServer = servers.find((server) => server.serverUrl === url);
    if (!targetServer) {
      continue;
    }

    try {
      // 发送证书给目标用户
      const result = await targetServer.post({
        type: "agent-data",
        friendId: userId,
        data: {
          kind: "verify-my-device", // 验证是否我的设备
          userCard: await getMyCardData(userDirName),
          certificate,
          verifyCode,
          waitingTime,
          taskId,
        },
      });

      if (result.code === 200) {
        // 发送成功
        tasks.set(taskId, {
          resolve,
          reject,
          userDirName,
          toOppoCertificate: certificate,
        });

        // 超时不等
        rejectTimer = setTimeout(() => {
          tasks.delete(taskId);
          reject(new Error("发送证书验证超时"));
        }, waitingTime);
        break;
      }
    } catch (e) {
      console.log(e);
    }
  }

  return prms;
};

on("server-agent-data", async (e) => {
  if (e.data.kind === "response-my-device") {
    const { userCard, certificate: toMeCertificate, taskId } = e.data;

    // 从tasks中查找
    const task = tasks.get(taskId);
    if (!task) {
      return;
    }
    const { resolve, reject, userDirName } = task;

    // 获取自己的id
    const selfUserStore = await getUserStore(userDirName);
    const selfUserId = selfUserStore.userId;

    // 验证证书
    const verifyResult = await verifyDeviceCertificate(
      toMeCertificate,
      userCard,
      selfUserId
    );

    if (!verifyResult.success) {
      console.error(verifyResult.error);
      return;
    }

    try {
      const deviceData = await addDevice({
        userDirName,
        toOppoCertificate: task.toOppoCertificate,
        toMeCertificate,
        userCard,
      });

      resolve(deviceData);
    } catch (err) {
      reject(err);
    }
  }
});

// 添加设备
const addDevice = async ({
  userDirName,
  toOppoCertificate,
  toMeCertificate,
  userCard,
}) => {
  const selfUserStore = await getUserStore(userDirName);
  const selfUserId = selfUserStore.userId;

  // 所有验证通过，将双方的证书保存到自己的设备列表中
  const deviceStore = await getDeviceStore(userDirName);

  const toOppoUserId = await getHash(toOppoCertificate.data.publicKey);

  // 验证证书是否给我的，是否我授权给对方的
  if (toMeCertificate.data.authTo !== selfUserId) {
    throw new Error(`添加设备时发现，证书不是给我的`);
  }

  if (toOppoUserId !== selfUserId) {
    throw new Error(`不是我颁发给对方的证书`);
  }

  const toMeUserId = await getHash(toMeCertificate.data.publicKey);

  // 判断互相授权的用户是否一致
  if (toMeUserId !== toOppoCertificate.data.authTo) {
    throw new Error("我颁发给对方证书的Id不一致");
  }

  // 生成联合证书id
  const unId = Math.random().toString(36).slice(2);

  // 保存证书
  deviceStore.push({
    unId,
    userCard,
    toOppoCertificate,
    toMeCertificate,
  });

  await deviceStore.ready(true);

  // 查找到目标并返回
  return deviceStore.find((item) => item.unId === unId);
};

// 有用户向你发送添加请求
// deviceCode 设备码
// confirm 确认信息
export const onEntryDevice = async (
  { deviceCode, verifyCode, confirm },
  userDirName
) => {
  // 前从服务器查找用户
  const servers = await getServers(userDirName);

  // 等待服务器准备完成
  await servers.watchUntil(() => servers.every((server) => server.initialized));

  // 向服务器设置邀请码
  await Promise.all(
    servers.map(async (server) => {
      if (server.connectionState !== "connected") {
        return;
      }

      try {
        // 设置设备码
        await server.post({
          type: "invite-code",
          setInviteCode: deviceCode,
        });
      } catch (e) {
        console.log(e);
      }
    })
  );

  return on("server-agent-data", async (e) => {
    if (e.data.kind === "verify-my-device") {
      const {
        userCard,
        certificate,
        verifyCode: _verifyCode,
        taskId,
        waitingTime,
      } = e.data;

      // 确保验证码一致
      if (verifyCode !== _verifyCode) {
        return;
      }

      const selfUserStore = await getUserStore(userDirName);
      const verifyResult = await verifyDeviceCertificate(
        certificate,
        userCard,
        selfUserStore.userId
      );

      if (!verifyResult.success) {
        console.error(verifyResult.error);
        return;
      }

      // 所有验证通过，开始询问用户是否添加
      const result = await confirm({
        userData: userCard.data,
        waitingTime,
      });

      if (result) {
        let expire = Date.now() + 1000 * 60 * 60 * 24 * 30;
        if (typeof result === "object") {
          expire = result.expire;
        }

        // 计算对方的id
        const userId = await getHash(userCard.data.publicKey);

        // 用户确认通过，开始添加
        // 给目标用户签发证书
        const oppoCertificate = await signData(
          {
            authTo: userId, // 授权给目标用户
            permission: "Fully", // 完全的授权，代表是本人设备
            expire,
          },
          userDirName
        );

        // 向目标发送数据
        const responseResult = await e.server.post({
          type: "agent-data",
          friendId: userId,
          data: {
            kind: "response-my-device", // 验证是否我的设备
            userCard: await getMyCardData(userDirName),
            certificate: oppoCertificate,
            verifyCode,
            taskId,
          },
        });

        if (responseResult.code === 200) {
          // 发送成功，将双方的证书保存到自己的设备列表中
          const deviceData = await addDevice({
            userDirName,
            toOppoCertificate: oppoCertificate,
            toMeCertificate: certificate,
            userCard,
          });

          return deviceData;
        }
      }

      return false;
    }
  });
};

// 验证证书和用户卡片
const verifyDeviceCertificate = async (certificate, userCard, selfUserId) => {
  // 验证证书
  const verifyResult = await verifyData(certificate);
  if (!verifyResult) {
    return {
      success: false,
      error: "证书验证失败",
    };
  }

  // 验证用户卡片信息
  const verifyCardResult = await verifyData(userCard);
  if (!verifyCardResult) {
    return {
      success: false,
      error: "用户卡片验证失败",
    };
  }

  // 确保用户卡片的id和证书的id一致
  if (userCard.data.publicKey !== certificate.data.publicKey) {
    return {
      success: false,
      error: "用户卡片与证书不匹配",
    };
  }

  // 确保证书是给我的，并且是完全授权
  if (
    certificate.data.authTo !== selfUserId ||
    certificate.data.permission !== "Fully"
  ) {
    return {
      success: false,
      error: "证书授权验证失败",
    };
  }

  return {
    success: true,
  };
};
