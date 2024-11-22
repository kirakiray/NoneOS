import { iceServers } from "./main.js";
import { get } from "/packages/fs/handle/index.js";

export const inited = (async () => {
  const icesHandle = await get("local/caches/ices").catch(() => null);

  if (icesHandle) {
    // 获取文件内容，并添加服务器列表
    const text = await icesHandle.text();
    const servers = JSON.parse(text);
    iceServers.push(...servers);
  }

  if (!icesHandle && !iceServers.length) {
    // 如果为空，添加默认的ice服务器
    iceServers.push(
      ...[
        { urls: "stun:stun.miwifi.com" },
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun.chat.bilibili.com" },
        { urls: "stun:stun.hot-chilli.net" },
        { urls: "stun:stun.cloudflare.com" },
        { urls: "stun:stunserver2024.stunprotocol.org" },
        { urls: "stun:w1.xirsys.com" },
        { urls: "stun:u1.xirsys.com" },
        { urls: "stun:stun.relay.metered.ca:80" },
        { urls: "stun:stun.hivestreaming.com" },
        { urls: "stun:stun.cdnbye.com" },
        { urls: "stun:stun.hitv.com" },
        { urls: "stun:stun.douyucdn.cn:18000" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
      ]
    );
  }

  iceServers.forEach(async (e) => {
    const result = await testIceServer(e).catch(() => null);
    if (result) {
      e.state = result.valid ? "ok" : "notok";
      e.time = result.latency;
    }
  });

  // 获取ICE服务器字符串
  const getIceStr = () => {
    return JSON.stringify(
      iceServers.map((e) => {
        return {
          urls: e.urls,
          username: e.username,
          credential: e.credential,
        };
      })
    );
  };

  let oldServersStr = getIceStr();

  iceServers.watchTick(async () => {
    const newServersStr = getIceStr();

    if (newServersStr !== oldServersStr) {
      const icesHandle = await get("local/caches/ices", {
        create: "file",
      });

      await icesHandle.write(newServersStr);

      oldServersStr = newServersStr;
    }
  }, 100);
})();

// 测试ICE服务器
function testIceServer(iceServer) {
  return new Promise((resolve, reject) => {
    const config = {
      iceServers: [iceServer],
    };

    const startTime = Date.now(); // 记录开始时间

    const peerConnection = new RTCPeerConnection(config);

    let resolved = false; // 标记是否已经 resolve

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && !resolved) {
        const candidate = event.candidate.candidate;
        const endTime = Date.now(); // 记录结束时间

        // 检查候选地址类型
        if (
          candidate.includes("typ srflx") ||
          candidate.includes("typ relay")
        ) {
          // 计算延迟
          const latency = endTime - startTime;
          // ICE 服务器有效
          resolve({ valid: true, latency });
          peerConnection.close();
          resolved = true;
        }
      }
    };

    peerConnection.onicecandidateerror = (event) => {
      if (!resolved) {
        reject(event);
        resolved = true;
      }
    };

    // 创建一个虚假的数据通道以触发 ICE 流程
    peerConnection.createDataChannel("test");

    // 设置本地描述
    peerConnection
      .createOffer()
      .then((offer) => peerConnection.setLocalDescription(offer))
      .catch((error) => {
        if (!resolved) {
          reject(error);
          resolved = true;
        }
      });
  });
}
