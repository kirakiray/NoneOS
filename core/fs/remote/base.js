export const fsId = Math.random().toString(32).slice(2);
export const filerootChannel = new BroadcastChannel("noneos-fs-channel");

export const badge = (eventName, options) => {
  return new Promise((resolve, reject) => {
    const taskId = `${eventName}-${Math.random().toString(32)}`;

    filerootChannel.postMessage({
      type: eventName,
      ...options,
      taskId,
    });

    let f = (e) => {
      const { data } = e;

      if (data.taskId === taskId) {
        filerootChannel.removeEventListener("message", f);
        resolve(data.result);
        f = null;
      }
    };

    filerootChannel.addEventListener("message", f);
  });
};

const registerMaps = {};

filerootChannel.addEventListener("message", async (event) => {
  const { data } = event;

  console.log(data);
  if (registerMaps[data.type]) {
    const result = await registerMaps[data.type]({ ...data });

    filerootChannel.postMessage({
      result,
      taskId: data.taskId,
    });
  }
});

export const register = (eventName, func) => {
  registerMaps[eventName] = func;
};
