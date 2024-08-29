export const target = new EventTarget();

// 绑定事件
export const bind = (name, func) => {
  target.addEventListener(name, func);

  return () => {
    target.removeEventListener(name, func);
  };
};

// 主动触发事件
export const emitEvent = (name, options) => {
  const event = new Event(name);
  Object.assign(event, options);
  target.dispatchEvent(event);
};

// 已连接的用户
export const clients = new Map();
