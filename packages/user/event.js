const emiter = new EventTarget();

// 监听事件
export const on = (eventName, callback) => {
  const func = (e) => {
    callback(e.detail);
  };

  emiter.addEventListener(eventName, func);

  return () => {
    emiter.removeEventListener(eventName, func);
  };
};

// 触发事件
export const emit = (eventName, detail) => {
  emiter.dispatchEvent(new CustomEvent(eventName, { detail }));
};
