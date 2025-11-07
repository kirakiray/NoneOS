import { getFileChunkHashesAsync, getHash } from "/packages/util/hash/main.js";
import { setting } from "/packages/fs/fs-remote/file.js";

// 专门用于复制到远端设备中的方法
export const copyTo = ({
  localUser,
  files,
  userId,
  userSessionId,
  callback,
}) => {
  const controller = new AbortController();

  const cancel = localUser.bind("receive-data", (e) => {
    const { data, fromUserId, fromUserSessionId } = e.detail;

    if (fromUserId !== userId || fromUserSessionId !== userSessionId) {
      return;
    }

    if (data.kind === "response-chunk-result") {
      // 清除等待的hash
      const resolve = pendingChunks.get(data.hash);

      if (!resolve) {
        console.log("没有找到对应的hash", data.hash);
        return;
      }

      resolve();

      pendingChunks.delete(data.hash);
      if (waitForSendResolve) {
        const backupResolve = waitForSendResolve;
        waitForSendResolve = null;
        backupResolve();
      }
    }
  });

  (async () => {
    // 获取远端用户
    const remoteUser = await localUser.connectUser(userId);

    let fileIndex = 0;
    for (let file of files) {
      // 然后开始发送小块给对方
      await sendFile({
        signal: controller.signal,
        file,
        fileIndex,
        remoteUser,
        userSessionId,
        callback,
      });

      fileIndex++;
    }

    callback({
      kind: "sending-end",
      done: true,
    });
  })();

  return () => {
    cancel();
    controller.abort();
  };
};

const concurrentBlocksCount = 2; // 并发发送的块数量
const pendingChunks = new Map(); // 正在等待确认的文件块

let waitForSendResolve = null;

// 发送文件给对方
const sendFile = async ({
  file,
  fileIndex,
  signal,
  remoteUser,
  userSessionId,
  callback,
}) => {
  // 组装数据，告诉对方文件的大小
  callback({
    kind: "calculate-hash",
    fileIndex,
  });

  // 先给文件进行分块
  const chunkHashes = await getFileChunkHashesAsync(file, {
    chunkSize: setting.chunkSize,
  });

  const send = (data) => {
    remoteUser.post(data, userSessionId);
  };

  const fileHash = await getHash(chunkHashes.join(""));

  // 组装数据，告诉对方文件的大小
  send({
    kind: "file-info",
    name: file.name,
    fileHash,
    fileSize: file.size,
    chunkSize: setting.chunkSize,
    hashes: chunkHashes,
  });

  callback({
    kind: "sending-start",
    name: file.name,
    total: chunkHashes.length,
    fileIndex,
  });

  let sentCount = 0; // 已发送的块数量
  let sentSuccessCount = 0; // 已发送成功的块数量

  // 复制一份hash数组，用于后续操作
  // 去重：确保重复内容的块只发送一次
  const pendingChunkHashes = Array.from(new Set(chunkHashes));

  while (pendingChunkHashes.length) {
    const hash = pendingChunkHashes.shift();

    const index = chunkHashes.indexOf(hash);

    let chunk = file.slice(
      index * setting.chunkSize,
      (index + 1) * setting.chunkSize
    );

    if (chunk instanceof Blob) {
      chunk = await chunk.arrayBuffer();
    }

    if (signal.aborted) {
      break;
    }

    // 发送块数据
    send({
      kind: "chunk",
      fileHash,
      chunkHash: hash,
      chunk: new Uint8Array(chunk),
    });

    // 确认有多少个重复内容的块
    const repeatCount = chunkHashes.filter((item) => item === hash).length;

    sentCount += repeatCount;

    callback({
      kind: "sending-chunk",
      name: file.name,
      hash,
      count: sentCount,
      total: chunkHashes.length,
      fileIndex,
    });

    pendingChunks.set(hash, () => {
      sentSuccessCount += repeatCount;
      callback({
        kind: "send-chunk-succeed",
        name: file.name,
        hash,
        count: sentSuccessCount,
        total: chunkHashes.length,
        fileIndex,
      });
    });

    // 判断是否已经超出并发发送的块数量
    if (pendingChunks.size >= concurrentBlocksCount) {
      // 添加等待的函数
      await new Promise((resolve) => {
        // 超时的话，将hash重新加入队列下次再发送
        const timer = setTimeout(() => {
          pendingChunkHashes.push(hash);
          sentCount -= repeatCount;
          pendingChunks.delete(hash);

          callback({
            kind: "send-chunk-timeout",
            name: file.name,
            hash,
            count: sentCount,
            total: chunkHashes.length,
            fileIndex,
          });

          waitForSendResolve = null;
          resolve();
        }, 8000);

        waitForSendResolve = () => {
          clearTimeout(timer);
          resolve();
        };
      });
    }
  }
};
