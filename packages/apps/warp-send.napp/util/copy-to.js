import { calculateFileChunkHashes, getHash } from "/packages/fs/util.js";
import { setting } from "/packages/fs/fs-remote/file.js";

// 专门用于复制到远端设备中的方法
export const copyTo = ({
  localUser,
  files,
  userId,
  userSessionId,
  progress,
  end,
}) => {
  const controller = new AbortController();

  const cancel = localUser.bind("receive-data", (e) => {
    const { data, fromUserId, fromUserSessionId } = e.detail;

    if (fromUserId !== userId || fromUserSessionId !== userSessionId) {
      return;
    }

    if (data.kind === "response-chunk-result") {
      // 清除等待的hash
      if (!sendingHash.has(data.hash)) {
        return;
      }

      sendingHash.delete(data.hash);
      if (waitSendResolve) {
        waitSendResolve();
        waitSendResolve = null;
      }
    }
  });

  (async () => {
    // 获取远端用户
    const remoteUser = await localUser.connectUser(userId);

    for (let file of files) {
      // 然后开始发送小块给对方
      await sendFile({
        signal: controller.signal,
        file,
        remoteUser,
        userSessionId,
      });
    }
  })();

  return () => {
    cancel();
    controller.abort();
  };
};

const concurrentBlocksCount = 2; // 并发发送的块数量
const sendingHash = new Set(); // 正在发送的文件hash

let waitSendResolve = null;

// 发送文件给对方
const sendFile = async ({ file, signal, remoteUser, userSessionId }) => {
  // 先给文件进行分块
  const chunkHashes = await calculateFileChunkHashes(file, {
    chunkSize: setting.chunkSize,
  });

  const send = (data) => {
    remoteUser.post(data, {
      userSessionId,
    });
  };

  // 组装数据，告诉对方文件的大小
  send({
    kind: "send-file",
    name: file.name,
    fileSize: file.size,
    chunkSize: setting.chunkSize,
    hashes: chunkHashes,
  });

  // TODO: 逐步分块发送给对方
  for (let i = 0; i < chunkHashes.length; i++) {
    const hash = chunkHashes[i];

    let chunk = file.slice(i * setting.chunkSize, (i + 1) * setting.chunkSize);

    if (chunk instanceof Blob) {
      chunk = await chunk.arrayBuffer();
    }

    if (signal.aborted) {
      break;
    }

    // 发送块数据
    send(new Uint8Array(chunk));

    sendingHash.add(hash);

    // 判断是否已经超出并发发送的块数量
    if (sendingHash.size >= concurrentBlocksCount) {
      // 添加等待的函数
      await new Promise((resolve) => {
        waitSendResolve = resolve;
      });
    }
  }
};
