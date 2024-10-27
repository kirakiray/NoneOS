import { User } from "/packages/user/public-user.js";
import { get } from "/packages/fs/handle/index.js";
import { servers, emit, userMiddleware } from "../main.js";
import { CHUNK_REMOTE_SIZE } from "../../fs/util.js";

const STARTCHANNEL = "startChannel";

// 获取存放日志的文件
const saveLog = async (userId, data) => {
  const fileHandle = await get(
    `local/caches/user-logs/${userId}/${Date.now()}.json`,
    {
      create: "file",
    }
  );

  await fileHandle.write(
    JSON.stringify({
      time: Date.now(),
      _data: data,
    })
  );
};

const MAX_USER_LOG_COUNT = 200; // 单个用户缓存日志最大数目
const KEEP_USER_LOG_COUNT = MAX_USER_LOG_COUNT / 2; // 单个用户删除日志到这个数目
{
  let clearFun;
  // 定时清除日志
  setInterval(
    (clearFun = async () => {
      const usersDir = await get(`local/caches/user-logs`, {
        create: "dir",
      });

      if (!usersDir) {
        return;
      }

      for await (let userHandle of usersDir.values()) {
        const len = await userHandle.length();

        if (len > MAX_USER_LOG_COUNT) {
          // 超过指定数量，就删除到指定数量一半就行
          const items = [];
          await userHandle.forEach(async (item) => items.push(item));

          // 排序
          items.sort((a, b) => a.createTime - b.createTime);

          for (
            let i = 0, targetLen = len - KEEP_USER_LOG_COUNT;
            i < targetLen;
            i++
          ) {
            const targetItem = items[i];
            await targetItem.remove();
          }
        }
      }
    }),
    60 * 1000
  );

  setTimeout(clearFun, 1000);
}

export class UserClient extends $.Stanz {
  #rtcConnection; // 主体rtc连接对象
  #channels = new Map(); // 存放channel 的对象
  #user; // 用户数据
  constructor(opt) {
    super({
      /**
       * state 的状态按顺序如下:
       * disconnected: 断开连接
       * connecting: 正在连接中
       * connected: 已经连接
       * closed: 已经关闭
       * send-remote: 向对方发送了 offer
       * set-remote: 接收到了远方的 offer 并设置到本地
       */
      state: "disconnected",
      delayTime: "-", // 延迟时间
    });

    const { data, sign } = opt;
    const user = (this.#user = new User(data, sign));

    Object.assign(this, {
      userId: user.id,
      userName: user.name,
      time: user.get("time") || user.get("creation"),
    });
  }

  async verify() {
    return await this.#user.verify();
  }

  // 统一的初始化信道的方法
  _bindChannel(channel) {
    channel.onmessage = (e) => this.#onmsg(e, channel);

    channel.onclose = async () => {
      console.log("channel close: ", channel.label, channel);

      const cachedChannel = await this.#channels.get(channel.label);

      if (cachedChannel === channel) {
        this.#channels.delete(channel.label);

        if (!this.#channels.size) {
          // 没有通道的时候，代表已经关闭
          this.state = "closed";

          // 清空rtc连接
          this.#rtcConnection = null;

          // 用户关闭事件
          emit("user-closed", {
            target: this,
          });
        }
      }
    };

    channel.onopen = () => {
      if (this.#channels.size >= 1) {
        this.state = "connected";

        emit("user-connected", {
          target: this,
        });

        // 初次测试延迟
        this.ping();
      }
    };

    // channel.onerror = (e) => {
    //   debugger;
    // };

    this.#channels.set(channel.label, channel);

    return channel;
  }

  // 获取或创建新的信道
  async _getChannel(
    channelName = "channel-" + Math.random().toString(26).slice(3)
  ) {
    if (this.#channels.get(channelName)) {
      return this.#channels.get(channelName);
    }

    const rtcPC = this.#rtcConnection;

    // 监听后立刻创建通道，否则createOffer再创建就会导致上面的ice监听失效
    const targetChannel = rtcPC.createDataChannel(channelName);

    return this._bindChannel(targetChannel);
  }

  initRTC() {
    const rtcPC = (this.#rtcConnection = new RTCPeerConnection());

    // RTC对象的事件
    // icecandidate：当找到新的 ICE 候选者时触发。
    // datachannel：当一个新的数据通道被创建时触发。
    // iceconnectionstatechange：当 ICE 连接状态改变时触发。
    // icegatheringstatechange：当 ICE 收集状态改变时触发。
    // signalingstatechange：当信令状态改变时触发。
    // negotiationneeded：当需要重新协商连接时触发。
    // track：当一个新的媒体轨道被添加到连接时触发。

    rtcPC.ondatachannel = (event) => {
      const { channel } = event;

      // 通过设置 remote 后触发的添加channel事件
      this._bindChannel(channel);
    };

    rtcPC.onicecandidate = (event) => {
      const { candidate } = event;

      if (candidate) {
        // 传递 icecandidate
        this._serverAgentPost({
          step: "set-candidate",
          candidate,
        });
      }
    };

    // rtcPC.oniceconnectionstatechange = (event) => {
    //   // TODO： 当 ICE 连接状态改变时触发。状态可能包括 new、checking、connected、completed、failed、disconnected 和 closed。
    //   // debugger;
    // };

    // rtcPC.onicegatheringstatechange = (event) => {
    //   // TODO: 当 ICE 收集状态改变时触发。状态可能包括 new、gathering 和 complete。
    //   // debugger;
    // };

    // rtcPC.onnegotiationneeded = (event) => {
    //   // TODO: 当需要重新协商连接时触发
    //   // debugger;
    // };

    return rtcPC;
  }

  // 连接这个用户
  async connect() {
    if (this.state !== "disconnected" && this.state !== "closed") {
      // 只允许未连接的情况下进行通信
      return;
    }

    this.state = "connecting";

    // const rtcPC = this.#rtcConnection || this.initRTC(); // 开始初始化
    const rtcPC = this.initRTC(); // 重新开始初始化更有效率

    await this._getChannel(STARTCHANNEL); // 必须先创建channel ，不然不会触发 ice 事件

    const offer = await rtcPC.createOffer();

    // 设置给自身
    rtcPC.setLocalDescription(offer);

    await this._serverAgentPost({
      step: "set-remote",
      offer,
    });

    this.state = "send-remote";

    return true;
  }

  // 接收到对面用户发过来的数据
  #onmsg(e, channel) {
    // channel 响应数据
    let { data } = e;

    if (data === "__ping") {
      // 返回测试延迟的字段
      this.send("__pong");
      return;
    } else if (data === "__pong") {
      if (this.__pingResolve) {
        this.__pingResolve();
      }
      return;
    }

    if (typeof data === "string") {
      // 保存日志
      saveLog(this.userId, data);

      // 转换数据
      data = JSON.parse(data);

      // 根据类型执行操作
      switch (data.type) {
        case "msg":
          console.log(data.value);
          break;
        default:
          const midFunc = userMiddleware.get(data.type);
          if (midFunc) {
            midFunc(data, this, channel);
          }
      }
    } else {
      // TODO: 处理二进制数据
      debugger;
    }
  }

  // 向对面发送数据
  async send(data) {
    if (this.state !== "connected") {
      throw new Error("The user is not connected yet, and data cannot be sent");
    }

    if (isPlainObject(data)) {
      data = JSON.stringify(data);
    }

    // TODO: 获取第一个通道进行发送，后期应该分担到多个通道上
    const channel = this.#channels.get(STARTCHANNEL);

    if (data.length > CHUNK_REMOTE_SIZE) {
      throw new Error(
        `The data sent cannot be larger than ${CHUNK_REMOTE_SIZE / 1024}kb`
      );
    }

    channel.send(data);
  }

  // 测试延迟时间
  async ping() {
    if (this._pinging) {
      return this._pinging;
    }

    this.delayTime = "-";

    return (this._pinging = new Promise((resolve) => {
      setTimeout(async () => {
        const pingTime = Date.now();

        this.send("__ping");

        // 等待返回的函数
        this.__pingResolve = () => {
          // 更新延迟时间
          this.delayTime = Date.now() - pingTime + "ms";

          // 清空临时对象
          this.__pingResolve = null;
          this._pinging = null;
        };
      }, 50);
    }));
  }

  // 通过服务器转发内容
  async _serverAgentPost(data) {
    const ser = await this._getServer();

    if (ser) {
      return await ser
        ._post({
          agent: {
            targetId: this.userId,
            data,
          },
        })
        .then((e) => e.json())
        .catch(() => null);
    }

    return false;
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
            search: this.userId,
          })
          .then((e) => e.json())
          .catch(() => null);

        if (!sResult || !sResult.user) {
          continue;
        }

        if (sResult.ok && sResult.user) {
          // 验证用户信息是否正确
          const user = new User(sResult.user.data, sResult.user.sign);

          if (user.id !== this.userId || !(await user.verify())) {
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

  // 通过服务端转发到用户
  async _onServerAgent(data) {
    let rtcPC = this.#rtcConnection;

    if (!rtcPC) {
      rtcPC = this.initRTC();
    }

    console.log("server agent : ", data);

    switch (data.step) {
      case "set-remote":
        this.state = "set-remote";

        rtcPC.setRemoteDescription(data.offer);
        const anwserOffter = await rtcPC.createAnswer();
        rtcPC.setLocalDescription(anwserOffter);

        // 将answer转发回去
        this._serverAgentPost({
          step: "answer-remote",
          anwser: anwserOffter,
        });
        break;

      case "set-candidate":
        // 添加到本地信号
        const iceObj = new RTCIceCandidate(data.candidate);
        rtcPC.addIceCandidate(iceObj);
        break;
      case "answer-remote":
        rtcPC.setRemoteDescription(data.anwser);
        break;
      default:
        // TODO: 不明状态
        debugger;
        break;
    }
  }
}

function isPlainObject(obj) {
  return Object.prototype.toString.call(obj) === "[object Object]";
}
