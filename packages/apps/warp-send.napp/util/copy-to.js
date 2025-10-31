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
      // 开始接收文件
      // const fileHandle = await chunksHandle.get(data.name, {
      //   create: "file",
      // });

      debugger;
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

const concurrentBlocksCount = 8; // 并发发送的块数量

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
    // const hash = chunkHashes[i];

    let chunk = file.slice(i * setting.chunkSize, (i + 1) * setting.chunkSize);

    if (chunk instanceof Blob) {
      chunk = await chunk.arrayBuffer();
    }

    if (signal.aborted) {
      break;
    }

    // 发送块数据
    send(new Uint8Array(chunk));
  }
};
