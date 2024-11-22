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

// 辅助连接的 ice 服务器
export const iceServers = $.stanz([]);
