// 所有存放的服务器
export const servers = $.stanz([]);

// 所有的用户
export const users = $.stanz([]);

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
export const blocks = $.stanz({
  get: [], // 获取块操作
  save: [], // 保存块操作
  clear: [], // 清除块操作
});
