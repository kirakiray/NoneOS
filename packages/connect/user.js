import { getUserCard } from "../user/usercard.js";
import { User } from "../user/public-user.js";
import { servers } from "./server.js";
import { reponseBridge } from "../fs/r-handle/bridge.js";
import { getCerts } from "/packages/user/cert.js";
import { getSelfUserInfo } from "../user/main.js";
import { calculateHash } from "../fs/util.js";
import { CHUNK_REMOTE_SIZE } from "../fs/util.js";
import { getCache, saveCache } from "../fs/cache/util.js";

export const users = $.stanz([]);

export const connectUser = async (userId) => {
  const target = users.find((client) => client.id === userId);
  if (target) {
    return target;
  }

  const cards = await getUserCard();

  const targetUser = cards.find((e) => e.id === userId);

  if (!targetUser) {
    throw new Error(`not found usercard: ${userId}`);
  }

  const client = new ClientUser(targetUser);

  await client.connect();

  return client;
};

const STARTCHANNEL = "startChannel";

export class ClientUser extends $.Stanz {
  #user = null;
  #rtcConnection;
  #channels = {};
  constructor(user) {
    if (!(user instanceof User)) {
      user = new User(user.data, user.dataSignature);
    }

    super({
      delayTime: 0, // 用户间的延迟时间
      state: "disconnected", // 连接状态
    });

    this.#user = user;
  }

  // 初始化rtc
  _init() {
    if (!users.some((e) => e.id === this.id)) {
      users.push(this);
    }

    let rtcPC = this.#rtcConnection;

    if (
      rtcPC
      // && (rtcPC.connectionState === "connected" ||
      //   rtcPC.connectionState === "connecting")
    ) {
      rtcPC.onconnectionstatechange = null;
      rtcPC.ondatachannel = null;
      rtcPC.onicecandidate = null;
      rtcPC.close();
    }

    // 建立rtc实例
    rtcPC = this.#rtcConnection = new RTCPeerConnection();

    rtcPC.onconnectionstatechange = () => {
      const state = rtcPC.connectionState;

      if (state === "connecting" || state === "connected") {
        this.state = state;
      }

      // console.log("onconnectionstatechange: ", state);
    };

    rtcPC.ondatachannel = (event) => {
      const { channel } = event;

      this._bindChannel(channel);

      // console.log("ondatachannel: ", channel);
    };

    rtcPC.onicecandidate = (event) => {
      const { candidate } = event;

      if (candidate) {
        // 传递 icecandidate
        this._serverAgentPost({
          step: "set-candidate",
          candidate,
        });

        // console.log("candidate: ", candidate);
      }
    };

    return rtcPC;
  }

  async connect() {
    if (this.state === "connected" || this.state === "connecting") {
      return;
    }

    // 连接前先查看是否有服务器可用，没有可用服务器就别发了
    await this._getServer();

    // const rtcPC = this.#rtcConnection || this._init();
    const rtcPC = this._init();

    // 必须在createOffer前创建信道，否则不会产生ice数据
    this._getChannel(STARTCHANNEL);

    const offer = await rtcPC.createOffer();

    // 设置给自身
    rtcPC.setLocalDescription(offer);

    const result = await this._serverAgentPost({
      step: "set-remote",
      offer,
    });

    return result;
  }

  // 发送数据给对面
  async send(data, channelName = STARTCHANNEL) {
    this._send(
      JSON.stringify({
        data,
      }),
      (channelName = STARTCHANNEL)
    );
  }
  async _send(data, channelName = STARTCHANNEL) {
    if (this.state === "closed") {
      // 重新连接
      await this.connect();
    }

    if (isPlainObject(data)) {
      data = JSON.stringify(data);
    }

    if (!data) {
      return;
    }

    await this.watchUntil(() => this.state === "connected");
    const targetChannel = await this._getChannel(channelName);

    if (data.length > CHUNK_REMOTE_SIZE) {
      // 先将大文件哈希数据发送，再将文件内容发送
      const splitData = [];
      const chunksInfo = {
        splitData,
      };

      // 超过 64kb 需要拆包
      const chunks = await Promise.all(
        splitStringBy50KB(data).map(async (content) => {
          const hash = await calculateHash(content);
          splitData.push(hash);
          return {
            chunkData: {
              hash,
              content,
            },
          };
        })
      );

      targetChannel.send(JSON.stringify(chunksInfo));

      setTimeout(() => {
        chunks.forEach((e) => {
          targetChannel.send(JSON.stringify(e));
        });
      }, 100);

      return;
    }

    targetChannel.send(data);
  }

  // 测试延迟
  ping(loopDelayTime) {
    if (this.state === "connected") {
      return new Promise((resolve) => {
        clearTimeout(this.__ping_timer);
        const pingTime = Date.now();
        this.__pingFunc = () => {
          this.__pingFunc = null;
          const delayTime = Date.now() - pingTime;

          this.delayTime = delayTime;

          resolve(delayTime);

          if (loopDelayTime) {
            this.__ping_timer = setTimeout(
              () => {
                this.ping(loopDelayTime);
              },
              loopDelayTime === true ? 10000 : loopDelayTime
            );
          }
        };
        this._send("__ping");
      });
    }

    return Promise.resolve("-");
  }

  // 通过代理转发的初始化信息
  async _agentConnect(data) {
    // console.log("_agentConnect", data);

    let rtcPC = this.#rtcConnection || this._init();

    const { step } = data;

    switch (step) {
      case "set-remote":
        rtcPC = this._init();
        rtcPC.setRemoteDescription(data.offer);

        const anwserOffter = await rtcPC.createAnswer();
        rtcPC.setLocalDescription(anwserOffter);

        this._serverAgentPost({
          step: "answer-remote",
          anwser: anwserOffter,
        });
        break;
      case "set-candidate":
        const iceObj = new RTCIceCandidate(data.candidate);

        rtcPC.addIceCandidate(iceObj);
        break;
      case "answer-remote":
        rtcPC.setRemoteDescription(data.anwser);
        break;
    }
  }

  // 统一的初始化信道的方法
  _bindChannel(channel) {
    const channelName = channel.label;

    if (this.#channels[channelName]) {
      this.#channels[channelName].then((oldChannel) => {
        // oldChannel.removeEventListener("message", msgFunc);
        oldChannel.onmessage = null;
        oldChannel.close();
      });
    }

    channel.onmessage = (e) => this._onmsg(e, channel);

    channel.addEventListener("close", async () => {
      console.log("channel close: ", channel.label, channel);

      const cachedChannel = await this.#channels[channel.label];

      if (cachedChannel === channel) {
        if (channelName === STARTCHANNEL) {
          this.state = "closed";
        }

        delete this.#channels[channel.label];
      }
    });

    return (this.#channels[channelName] = new Promise((resolve, reject) => {
      channel.onopen = () => {
        resolve(channel);

        this.ping();
      };

      channel.onerror = (e) => {
        reject(e);
      };
    }));
  }

  // 获取或创建新的信道
  async _getChannel(
    channelName = "channel-" + Math.random().toString(26).slice(3)
  ) {
    if (this.#channels[channelName]) {
      return this.#channels[channelName];
    }

    const rtcPC = this.#rtcConnection;

    // 监听后立刻创建通道，否则createOffer再创建就会导致上面的ice监听失效
    const targetChannel = rtcPC.createDataChannel(channelName);

    return this._bindChannel(targetChannel);
  }

  // 获取有效的证书
  async getCerts() {
    const certs = await getCerts();
    const selfUserInfo = await getSelfUserInfo();

    const targetCerts = []; // 符合目标的证书

    certs.forEach((cert) => {
      if ((cert.expire !== "never") & (cert.expire < Date.now())) {
        // 过期的拜拜
        return;
      }

      // 本机用户授权给远程的用户
      if (cert.authTo === this.id || cert.issuer === selfUserInfo.userID) {
        // 有效证书判断权限
        targetCerts.push(cert);
      }
    });

    return targetCerts;
  }

  // 查看对方是否有响应的权限
  async getPermissions() {
    const { __cachePermit } = this;
    if (__cachePermit) {
      const now = Date.now();
      let read = __cachePermit.readExpire > now,
        write = __cachePermit.writeExpire > now;

      if (read || write) {
        return {
          read,
          write,
        };
      }

      // 如果过期的话，重新往下走刷新证书权限
    }

    // 读取和写入权限的超时时间
    let readExpire = 0,
      writeExpire = 0;

    // 根据有效证书判断权限
    const certs = await this.getCerts();

    certs.forEach((cert) => {
      // 确认是我授权给对面的
      if (cert.permission === "fully") {
        const currentRead = cert.expire === "never" ? Infinity : cert.expire;
        const currentWrite = cert.expire === "never" ? Infinity : cert.expire;

        // 获取最有效的权限
        if (currentRead > readExpire) {
          readExpire = currentRead;
        }
        if (currentWrite > writeExpire) {
          writeExpire = currentWrite;
        }
      }
    });

    this.__cachePermit = {
      readExpire,
      writeExpire,
    };

    const now = Date.now();

    return {
      read: readExpire > now,
      write: writeExpire > now,
    };
  }

  async _onmsg(e, targetChannel) {
    let { data } = e;

    if (data === "__ping") {
      // 直接返回pong
      this._send("__pong");
      return;
    } else if (data === "__pong") {
      this.__pingFunc && this.__pingFunc();
      return;
    }

    let result = data;
    if (typeof data === "string") {
      result = JSON.parse(data);

      if (!result) {
        this._onmessage &&
          this._onmessage({
            channel: targetChannel,
            data: result,
          });

        return;
      }

      if (result.splitData) {
        // 暂时保存分块信息
        const splits = this._splits || (this._splits = []);
        splits.push({
          count: result.splitData.length, // 成功缓存的数量
          hashs: result.splitData,
          datas: [],
        });
        return;
      }

      if (result.chunkData) {
        // 通过已知的分块信息，重新组合数据
        const { chunkData } = result;
        // 重新组装分块信息
        const splits = this._splits || (this._splits = []);

        // 查找到对应的组
        const groupData = splits.find((item) =>
          item.hashs.includes(chunkData.hash)
        );

        // 替换掉原来的组的位置
        const id = groupData.hashs.indexOf(chunkData.hash);

        groupData.datas[id] = chunkData.content;

        groupData.count--;

        if (groupData.count > 0) {
          return;
        }

        // 当不等于0时，组装成完整的数据，往后面继续
        result = JSON.parse(groupData.datas.join(""));

        // 清除在 splits 上的缓存数据
        splits.splice(splits.indexOf(groupData), 1);
      }

      if (result.type === "getCache") {
        result.hashs.forEach(async (hash) => {
          const cache = await getCache(hash);

          if (cache) {
            this._send(cache);
          }
        });
        return;
      }

      if (result.data) {
        this._onmessage &&
          this._onmessage({
            channel: targetChannel,
            data: result.data,
          });

        return;
      }
    } else if (result instanceof ArrayBuffer) {
      const hash = await calculateHash(result);

      // 缓存文件
      await saveCache(hash, result);
      return;
    }

    // 在有权限的情况下，才能响应桥接方法
    const permit = await this.getPermissions();

    reponseBridge(result, permit, (data) => {
      this._send(data);
    });
  }

  // 查找最好的服务器进行发送
  async _getServer() {
    if (this._bestServer) {
      // 直接返回已设置的最好的服务器
      return this._bestServer;
    }

    return (this._bestServer = new Promise(async (resolve, reject) => {
      // 先根据延迟进行排序
      const sers = (
        await Promise.all(
          servers.map(async (e) => {
            await e.ping();
            return e;
          })
        )
      ).sort((a, b) => {
        return a.delayTime - b.delayTime;
      });

      for (let ser of sers) {
        // 查找用户是否存在
        const sResult = await ser
          ._post({
            search: this.id,
          })
          .then((e) => e.json())
          .catch(() => null);

        if (!sResult || !sResult.user) {
          continue;
        }

        if (sResult.ok && sResult.user) {
          // 验证用户信息是否正确
          const user = new User(sResult.user.data, sResult.user.sign);

          if (user.id !== this.id || !(await user.verify())) {
            // 不符合规定都直接劝退
            continue;
          }
        }

        resolve(ser);
      }

      const err = new Error("User not found on server");
      err.code = "userNotFound";

      reject(err);
    }));
  }

  // 通过服务器转发内容
  async _serverAgentPost(data) {
    const ser = await this._getServer();

    return await ser
      ._post({
        agent: {
          targetId: this.id,
          data,
        },
      })
      .then((e) => e.json())
      .catch(() => null);
  }

  get id() {
    return this.#user.id;
  }

  get name() {
    return this.#user.get("userName");
  }

  get data() {
    return this.#user.data;
  }
}

function isPlainObject(obj) {
  return Object.prototype.toString.call(obj) === "[object Object]";
}

function splitStringBy50KB(str) {
  const chunkSize = 50 * 1024; // 50KB
  let chunks = [];
  for (let i = 0; i < str.length; i += chunkSize) {
    chunks.push(str.slice(i, i + chunkSize));
  }
  return chunks;
}
