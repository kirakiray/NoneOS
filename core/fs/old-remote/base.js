export const fsId = Math.random().toString(32).slice(2);
export const filerootChannel = new BroadcastChannel("noneos-fs-channel");

export const remotes = globalThis.$ ? $.stanz([]) : [];

console.log("fsId", fsId);

export const badge = (eventName, options) => {
  return new Promise((resolve, reject) => {
    const taskId = `${eventName}-${Math.random().toString(32).slice(2)}`;

    filerootChannel.postMessage({
      type: eventName,
      ...options,
      taskId,
    });

    let timer = setTimeout(() => {
      reject(`badge timeout`);
    }, 10000);

    let f = (e) => {
      const { data } = e;

      if (data.taskId === taskId) {
        filerootChannel.removeEventListener("message", f);
        clearTimeout(timer);
        resolve(data.result);
        f = null;
        timer = null;
      }
    };

    filerootChannel.addEventListener("message", f);
  });
};

const registerMaps = {};

filerootChannel.addEventListener("message", async (event) => {
  const { data } = event;

  // console.log(data);
  if (registerMaps[data.type]) {
    const result = await registerMaps[data.type]({ ...data });

    if (result !== undefined) {
      filerootChannel.postMessage({
        result,
        taskId: data.taskId,
      });
    }
  }
});

export const post = (data) => {
  filerootChannel.postMessage(data);
};

export const register = (eventName, func) => {
  registerMaps[eventName] = func;
};
