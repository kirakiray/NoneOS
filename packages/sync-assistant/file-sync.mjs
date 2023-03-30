export default function fileSync({ channels }) {
  const { fileSyncChannel1: channel1, fileSyncChannel2: channel2 } = channels;

  const reObj = new EventTarget();

  const nowtime = Date.now();

  let f;

  channel1.addEventListener(
    "message",
    (f = (e) => {
      const data = JSON.parse(e.data);

      channel1.removeEventListener("message", f);

      if (nowtime > data.time) {
        init(channel2, channel1);
      } else {
        init(channel1, channel2);
      }
    })
  );

  channel1.send(
    JSON.stringify({
      type: "start",
      time: nowtime,
    })
  );

  return reObj;
}

const init = (mainChannel, remoteChannel) => {
  console.log({
    mainChannel,
    remoteChannel,
  });
};

fileSync.agreementName = "fileSync";

fileSync.version = 1;

fileSync.channels = ["fileSyncChannel1", "fileSyncChannel2"];
