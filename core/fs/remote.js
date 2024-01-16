export const remotes = [];

const fsId = Math.random().toString(32).slice(2);

const filerootChannel = new BroadcastChannel("noneos-fs-channel");

// 监听该频道并处理消息
filerootChannel.onmessage = function (event) {
  const { data } = event;

  switch (data.type) {
    case "init":
      remotes.push({
        fsId: data.fsId,
      });
      break;
    case "close":
      const oldId = remotes.findIndex((e) => e.fsId === data.fsId);
      if (oldId > -1) {
        remotes.splice(oldId, 1);
      }
      break;
  }

  console.log("all remotes", remotes);
};

filerootChannel.postMessage({
  type: "init",
  fsId,
});

globalThis.addEventListener("beforeunload", (event) => {
  filerootChannel.postMessage({
    type: "close",
    fsId,
  });
});
