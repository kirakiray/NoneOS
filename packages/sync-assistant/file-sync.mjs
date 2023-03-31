import fs from "../fs/index.mjs";

export default function fileSync({ channels, userInfo }) {
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
        init(channel2, channel1, userInfo);
      } else {
        init(channel1, channel2, userInfo);
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

fileSync.agreementName = "fileSync";

fileSync.version = 1;

fileSync.channels = ["fileSyncChannel1", "fileSyncChannel2"];

const init = (mainChannel, remoteChannel, userInfo) => {
  console.log({
    mainChannel,
    remoteChannel,
  });

  pollFile("/", mainChannel);

  remoteChannel.addEventListener("message", async (e) => {
    const data = JSON.parse(e.data);

    const path = `/user-${userInfo.id}${data.parentPath}`;

    const file = base64ToFile(data.b64, data.name);

    await fs.mkdirSure(path);

    await fs.writeFile(`${path}/${data.name}`, file);

    console.log(data, " => ", file);
  });
};

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

function base64ToFile(base64, filename) {
  const arr = base64.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  const blob = new File([u8arr], filename, { type: mime });
  return blob;
}

const sendFile = async ({ file, channel, ...e }) => {
  const b64 = await fileToBase64(file);

  channel.send(
    JSON.stringify({
      b64,
      ...e,
    })
  );
};

const pollFile = async (path, channel) => {
  const data = await fs.readDir(path);

  if (/user\-/.test(path)) {
    return;
  }

  if (data) {
    for await (const e of data) {
      if (e.type === "dir") {
        pollFile(`${path === "/" ? "" : path}/${e.name}`, channel);
      } else {
        const file = await fs.readFile(`${path}/${e.name}`);

        sendFile({ channel, parentPath: path, name: e.name, file });
      }
    }
  }
};
