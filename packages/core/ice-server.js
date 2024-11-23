import { iceServers } from "./main.js";
import { get } from "/packages/fs/handle/index.js";

export const pingIce = async (e) => {
  const pingFunc = async (item) => {
    const result = await testIceServer(item).catch(() => null);

    if (result) {
      item.state = result.valid ? "ok" : "notok";
      item.time = result.latency;
    } else {
      item.state = "notok";
    }
  };

  if (e) {
    return pingFunc(e);
  }

  for (let item of iceServers) {
    await pingFunc(item);
  }

  // await Promise.all(iceServers.map(pingFunc));
};

// 获取ICE服务器字符串
const getIceStr = () => {
  return JSON.stringify(
    iceServers.map((e) => {
      return {
        credential: e.credential,
        urls: e.urls,
        username: e.username,
      };
    })
  );
};

export const inited = (async () => {
  let icesHandle = await get("local/caches/ices").catch(() => null);

  if (icesHandle) {
    // 获取文件内容，并添加服务器列表
    const text = await icesHandle.text();

    if (!localStorage._iceUpdate) {
      await icesHandle.remove();
      icesHandle = null;
      localStorage._iceUpdate = 20241123;
    } else {
      const servers = JSON.parse(text);
      iceServers.push(...servers);
    }
  }

  if (!icesHandle && !iceServers.length) {
    // 如果为空，添加默认的ice服务器
    iceServers.push(
      ...[
        { urls: "stun:stun.tutous.com" },
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
        { urls: "stun:stun.cloudflare.com" },
      ]
    );

    saveIceServer();
  }

  setTimeout(() => {
    inited.then(() => {
      pingIce();
    });
  }, 1000);

  let oldServersStr = getIceStr();

  iceServers.watchTick(async () => {
    const newServersStr = getIceStr();

    if (newServersStr !== oldServersStr) {
      await saveIceServer();

      oldServersStr = newServersStr;
    }
  }, 100);
})();

// 保存ICE服务器
export const saveIceServer = async () => {
  const serverStr = getIceStr();

  const icesHandle = await get("local/caches/ices", {
    create: "file",
  });

  await icesHandle.write(serverStr);
};

// 测试ICE服务器
function testIceServer(iceServer) {
  return new Promise((resolve, reject) => {
    const config = {
      iceServers: [iceServer],
    };

    const startTime = Date.now(); // 记录开始时间

    const peerConnection = new RTCPeerConnection(config);

    let resolved = false; // 标记是否已经 resolve

    const timer = setTimeout(() => {
      peerConnection.close();
      reject();
    }, 5000);

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
          clearTimeout(timer);
          peerConnection.close();
          resolved = true;
        }
      }
    };

    peerConnection.onicecandidateerror = (event) => {
      if (!resolved) {
        reject(event);
        resolved = true;
        clearTimeout(timer);
        peerConnection.close();
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
          clearTimeout(timer);
          peerConnection.close();
        }
      });
  });
}
