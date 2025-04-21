import { createData } from "/packages/hybird-data/main.js";
import { get } from "/packages/fs/main.js";
import { getServers } from "../hand-server/main.js";
import { on } from "../event.js";
import { verifyData } from "../verify.js";
import { getHash } from "/packages/fs/util.js";
import { signData } from "../sign.js";
import { getMyCardData } from "../card/main.js";
import { getUserStore } from "../user-store.js";
import { encryptMessage } from "../rsa-util.js";

const deviceStoreCache = {};

// 获取所有设备列表
export const getDeviceStore = async (userDirName) => {
  userDirName = userDirName || "main";

  let deviceStorePromise = null;
  if (!deviceStoreCache[userDirName]) {
    deviceStoreCache[userDirName] = deviceStorePromise = get(
      `system/devices/${userDirName}`,
      {
        create: "dir",
      }
    ).then((devicesDir) => createData(devicesDir));
  } else {
    deviceStorePromise = deviceStoreCache[userDirName];
  }

  const deviceStore = await deviceStorePromise;

  // 等待数据准备好
  await deviceStore.ready(true);

  return deviceStore;
};

// 添加设备
// deviceCode 设备码
// confirm 确认信息
// userDirName 当前用户目录
export const findDevice = async (deviceCode, userDirName) => {
  // 从服务器查找用户
  const servers = await getServers(userDirName);

  // 等待服务器准备完成
  await servers.watchUntil(() => servers.every((server) => server.initialized));

  // 查找用户
  const remoteUsers = [];
  await Promise.all(
    servers.map(async (server) => {
      if (server.connectionState !== "connected") {
        return;
      }
      try {
        const response = await server.post({
          type: "invite-code",
          findInviteCode: deviceCode,
        });

        if (response.findInviteCode) {
          // 查找到用户了
          const { authedData } = response;

          remoteUsers.push({
            serverName: server.serverName,
            serverUrl: server.serverUrl,
            authedData,
          });
        }
      } catch (error) {
        console.log(error);
      }
    })
  );

  // 将相同的用户合并，并保留服务器地址和名称
  const mergedUsers = [];

  for (let userInfo of remoteUsers) {
    const verificationResult = await verifyData(userInfo.authedData);
    if (!verificationResult) {
      // 验证失败
      continue;
    }

    // 获取用户id
    const userId = await getHash(userInfo.authedData.data.publicKey);

    // 查找是否已经存在
    const existingUser = mergedUsers.find((user) => user.userId === userId);
    if (existingUser) {
      // 已经存在
      existingUser.serversData.push({
        serverName: userInfo.serverName,
        serverUrl: userInfo.serverUrl,
      });

      continue;
    }

    // 判断是否已经在我的设备中
    const myDevices = await getDeviceStore(userDirName);
    const existingMyDevice = myDevices.find((device) => {
      if (!device.toMeCertificate) {
        return false;
      }
      return (
        device.toMeCertificate.data.publicKey ===
        userInfo.authedData.data.publicKey
      );
    });

    mergedUsers.push({
      userId,
      userName: userInfo.authedData.data.userName,
      rsaPublicKey: userInfo.authedData.data.rsaPublicKey, // 加密字段专用公钥
      exited: existingMyDevice && existingMyDevice.unId,
      serversData: [
        {
          serverName: userInfo.serverName,
          serverUrl: userInfo.serverUrl,
        },
      ],
    });
  }

  return mergedUsers;
};

const pendingTasks = new Map();

// 授权用户
export const authDevice = async (
  {
    verifyCode, // 验证码
    userId, // 用户id
    expire, // 证书有效期
    rsaPublicKey, // 加密字段专用公钥
    servers: serverUrls, // 服务器地址
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

  let resolvePromise, rejectPromise;
  const authPromise = new Promise((resolve, reject) => {
    resolvePromise = (data) => {
      clearTimeout(timeoutTimer);
      pendingTasks.delete(taskId);
      resolve(data);
    };
    rejectPromise = reject;
  });

  let timeoutTimer;

  // 向目标发送数据
  for (let serverUrl of serverUrls) {
    const targetServer = servers.find(
      (server) => server.serverUrl === serverUrl
    );
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
          __hasEncrypted: true,
          userCard: await getMyCardData(userDirName),
          certificate,
          verifyCode: `__rsa_encrypt__${await encryptMessage(
            rsaPublicKey,
            verifyCode
          )}`,
          waitingTime,
          taskId,
        },
      });

      if (result.code === 200) {
        // 发送成功
        pendingTasks.set(taskId, {
          resolve: resolvePromise,
          reject: rejectPromise,
          userDirName,
          toOppoCertificate: certificate,
        });

        // 超时不等
        timeoutTimer = setTimeout(() => {
          pendingTasks.delete(taskId);
          rejectPromise(new Error("发送证书验证超时"));
        }, waitingTime);
        break;
      }
    } catch (error) {
      console.log(error);
    }
  }

  return authPromise;
};

on("server-agent-data", async (event) => {
  if (event.data.kind === "response-my-device") {
    const { userCard, certificate: toMeCertificate, taskId } = event.data;

    // 从pendingTasks中查找
    const task = pendingTasks.get(taskId);
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
    } catch (error) {
      reject(error);
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
  const deviceId = Math.random().toString(36).slice(2);

  // 保存证书
  deviceStore.push({
    unId: deviceId,
    userCard,
    toOppoCertificate,
    toMeCertificate,
  });

  await deviceStore.ready(true);

  // 查找到目标并返回
  return deviceStore.find((item) => item.unId === deviceId);
};

// 有用户向你发送添加请求
// deviceCode 设备码
// confirm 确认信息
export const onEntryDevice = async (
  { deviceCode, verifyCode, confirm },
  userDirName
) => {
  // 从服务器查找用户
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
      } catch (error) {
        console.log(error);
      }
    })
  );

  const cancelFunc = on("server-agent-data", async (e) => {
    if (e.data.kind === "verify-my-device") {
      const {
        userCard,
        certificate,
        verifyCode: receivedVerifyCode,
        taskId,
        waitingTime,
      } = e.data;

      // 确保验证码一致
      if (verifyCode !== receivedVerifyCode) {
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
      const confirmResult = await confirm({
        userData: userCard.data,
        waitingTime,
      });

      // TODO: 添加超时设定

      if (confirmResult) {
        let expireTime = Date.now() + 1000 * 60 * 60 * 24 * 30;
        if (typeof confirmResult === "object" && confirmResult.expire) {
          expireTime = confirmResult.expire;
        }

        // 计算对方的id
        const remoteUserId = await getHash(userCard.data.publicKey);

        // 用户确认通过，开始添加
        // 给目标用户签发证书
        const oppoCertificate = await signData(
          {
            authTo: remoteUserId, // 授权给目标用户
            permission: "Fully", // 完全的授权，代表是本人设备
            expire: expireTime,
          },
          userDirName
        );

        // 向目标发送数据
        const responseResult = await e.server.post({
          type: "agent-data",
          friendId: remoteUserId,
          data: {
            kind: "response-my-device", // 验证是否我的设备
            userCard: await getMyCardData(userDirName),
            certificate: oppoCertificate,
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

  return async () => {
    // 取消监听
    cancelFunc();

    const servers = await getServers(userDirName);

    servers.forEach((server) => {
      if (server.connectionState !== "connected") {
        return;
      }

      // 清空等待状态
      server.post({
        type: "invite-code",
        setInviteCode: 0,
      });
    });
  };
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
