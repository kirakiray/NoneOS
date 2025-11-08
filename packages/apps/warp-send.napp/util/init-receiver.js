import { getHash } from "/packages/util/hash/main.js";

// 初始化接收器
export const initReceiver = async ({
  localUser,
  progress,
  handle,
  appDedicatedHandle,
}) => {
  const tempHandles = {};
  const fileInfos = {};

  const chunksHandle = await appDedicatedHandle.get("__chunks_temp", {
    create: "dir",
  });

  // 获取文件块的临时文件夹
  const getChunkTempHandle = (fileHash) => {
    if (tempHandles[fileHash]) {
      return tempHandles[fileHash];
    }

    return (tempHandles[fileHash] = (async () => {
      return await chunksHandle.get("__" + fileHash, {
        create: "dir",
      });
    })());
  };

  return localUser.bind("receive-data", async (event) => {
    const { data, fromUserId, fromUserSessionId } = event.detail;

    // 确认对方是我的设备才进行操作
    const isMyDevice = await localUser.isMyDevice(fromUserId);

    if (!isMyDevice) {
      console.log("对方不是我的设备，不进行操作");
      // TODO: 不是设备要加入黑名单
      return;
    }

    if (data.kind === "file-info") {
      const { name, fileHash, fileSize, chunkSize, hashes } = data;
      fileInfos[fileHash] = {
        name,
        fileSize,
        chunkSize,
        hashes,
        uniqueChunkHashes: Array.from(new Set(hashes)),
        receivedChunks: [],
      };

      getChunkTempHandle(fileHash); // 提前建立缓存文件夹

      // 通知进度开始接收文件
      progress &&
        progress({
          kind: "send-file",
          name,
          fileHash,
          fileSize,
          chunkSize,
          hashes,
        });

      return;
    }

    if (data.kind === "chunk") {
      // 接收块文件
      const { fileHash, chunkHash, chunk } = data;
      const fileInfo = fileInfos[fileHash];

      if (!fileInfo) {
        console.warn("未收到文件信息，无法接收块文件");
        return;
      }

      const chunkTempHandle = await getChunkTempHandle(fileHash);

      fileInfo.receivedChunks.push(chunkHash);

      // 存入块文件
      const chunkFileHandle = await chunkTempHandle.get(chunkHash, {
        create: "file",
      });

      await chunkFileHandle.write(chunk);

      // 通知对方已收到块文件

      const remoteUser = await localUser.connectUser(fromUserId);
      remoteUser.post(
        {
          kind: "response-chunk-result",
          hash: chunkHash,
        },
        fromUserSessionId
      );

      // 更新进度
      progress &&
        progress({
          kind: "receiving-chunk",
          fileHash,
          chunkHash,
          progress:
            (fileInfo.receivedChunks.length /
              fileInfo.uniqueChunkHashes.length) *
            100,
          receivedChunks: fileInfo.receivedChunks,
        });

      // 如果收到的块已经足够了，则开始合并文件
      if (
        fileInfo.receivedChunks.length === fileInfo.uniqueChunkHashes.length
      ) {
        const content = [];
        for (const chunkHash of fileInfo.hashes) {
          const chunkFileHandle = await chunkTempHandle.get(chunkHash);
          content.push(await chunkFileHandle.file());
        }
        const blob = new Blob(content);

        // 写入目标文件
        const fileHandle = await handle.get(fileInfo.name, {
          create: "file",
        });
        await fileHandle.write(blob);

        // 删除存储缓存的目录
        await chunkTempHandle.remove();
        delete fileInfos[fileHash];
        delete tempHandles[fileHash];

        // 通知进度文件接收完成
        progress &&
          progress({
            kind: "file-received",
            fileHash,
            name: fileInfo.name,
          });
      }

      return;
    }

    if (data.kind === "send-end") {
      progress && progress({ kind: "send-end", done: true });
      return;
    }
  });
};
