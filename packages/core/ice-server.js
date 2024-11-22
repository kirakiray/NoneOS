import { iceServers } from "./main.js";

export const inited = (async () => {
  if (!iceServers.length) {
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

  iceServers.watchTick(() => {
    // debugger;
  }, 100);
})();
