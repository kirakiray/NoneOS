import { calculateFileChunkHashes, getHash } from "/packages/fs/util.js";
import { setting } from "/packages/fs/fs-remote/file.js";

// 专门用于复制到远端设备中的方法
export const copyTo = ({
  localUser,
  files,
  fromUserId,
  formSessionId,
  progress,
}) => {
  (async () => {
    // 获取远端用户
    const remoteUser = await localUser.connectUser(fromUserId);

    for (let file of files) {
      // 然后开始发送小块给对方
      await sendFile({ file, formSessionId, remoteUser });
    }
  })();
};

const sendFile = async ({ file, formSessionId, remoteUser }) => {
  // 先给文件进行分块
  const chunkHashes = await calculateFileChunkHashes(file, {
    chunkSize: setting.chunkSize,
  });

  // 组装数据，告诉对方项目的大小
  const initData = {
    kind: "send-file",
    name: file.name,
    chunkSize: setting.chunkSize,
    hashes: chunkHashes,
  };

  // 发送数据给对方
  remoteUser.post(initData, {
    sessionId: formSessionId,
  });

  // 逐步分块发送给对方
  for (let i = 0; i < chunkHashes.length; i++) {
    const hash = chunkHashes[i];
    let chunk = file.slice(i * setting.chunkSize, (i + 1) * setting.chunkSize);

    const realHash = await getHash(chunk);

    if (realHash !== hash) {
      throw new Error("分块哈希不一致");
    }

    debugger;

    if (chunk instanceof Blob) {
      chunk = await chunk.arrayBuffer();
    }

    remoteUser.post(new Uint8Array(chunk), {
      kind: "post-chunk",
      sessionId: formSessionId,
      hash,
    });

    debugger;
  }
};

// 初始化接收器
export const initReceiver = ({ localUser, progress, handle }) => {
  return localUser.bind("receive-data", async (e) => {
    const { data, fromUserId, fromUserSessionId } = e.detail;

    // 确认对方是我的设备才进行操作
    const isMyDevice = await localUser.isMyDevice(fromUserId);

    if (!isMyDevice) {
      console.log("对方不是我的设备，不进行操作");
      // TODO: 不是设备要加入黑名单
      return;
    }

    debugger;
  });
};
