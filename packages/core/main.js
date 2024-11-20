const hasOfa = typeof $ !== "undefined";

// 所有存放的服务器
export const servers = hasOfa ? $.stanz([]) : [];

// 所有的用户
export const users = hasOfa ? $.stanz([]) : [];

// 事件寄宿对象
const eTarget = new EventTarget();

// 触发事件
export const emit = (name, data) => {
  const event = new CustomEvent(name);
  event.data = data;
  eTarget.dispatchEvent(event);
};

// 绑定事件
export const on = (name, func) => {
  eTarget.addEventListener(name, func);

  return () => {
    eTarget.removeEventListener(name, func);
  };
};

// 用户数据操作用的中间件
export const userMiddleware = new Map();

// 等待中的块数据
export const blocks = hasOfa
  ? $.stanz([
      // {
      //   type: "get", // 块的操作类型
      //   // get // 获取块操作
      //   // save // 保存块操作
      //   // clear // 清除块操作
      //   hashs: [], // 要保存的块内容
      //   time: "", // 请求的时间
      //   reason: {} // 请求的原因
      // },
    ])
  : [];

if (!hasOfa) {
  // 兼容 dist.js 操作
  blocks.watchTick = () => {};
}

export const iceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun.miwifi.com" },
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
];
