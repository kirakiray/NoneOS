import { getHash } from "/packages/util/hash/main.js";

// 初始化接收器
export const initReceiver = async ({ localUser, progress, handle }) => {
  const receivedFiles = [];
  let currentReceivingFile = null;

  // 存储块的目录
  const chunksHandle = await handle.get("__warp-send-chunks", {
    create: "dir",
  });

  return localUser.bind("receive-data", async (event) => {
    const { data, fromUserId, fromUserSessionId } = event.detail;

    // 确认对方是我的设备才进行操作
    const isMyDevice = await localUser.isMyDevice(fromUserId);

    if (!isMyDevice) {
      console.log("对方不是我的设备，不进行操作");
      // TODO: 不是设备要加入黑名单
      return;
    }

    if (data.kind === "send-file") {
      // 记录文件描述
      currentReceivingFile = {
        kind: "send-file",
        name: data.name, // 文件名称
        hashes: data.hashes, // 文件的hash列表
        receivedChunks: [], // 已经收到的块hash
        fileSize: data.fileSize, // 文件大小
        chunkSize: data.chunkSize, // 每个块的最大大小
      };

      receivedFiles.push(currentReceivingFile);

      // 收到了文件描述，开始准备接受文件
      progress &&
        progress({
          ...currentReceivingFile,
        });
      return;
    }

    if (data instanceof Uint8Array) {
      // 收到了块文件，计算其hash
      const hash = await getHash(data);

      // 确认hash是否正确
      const index = currentReceivingFile.hashes.indexOf(hash);
      if (index === -1) {
        console.log("hash 不匹配");
        return;
      }

      // 先将块写入到缓存文件夹上
      const chunkHandle = await chunksHandle.get(`${hash}`, {
        create: "file",
      });

      await chunkHandle.write(data);

      currentReceivingFile.receivedChunks.push(hash);

      const remoteUser = await localUser.connectUser(fromUserId);

      //   await new Promise((res) => setTimeout(res, 500)); // 模拟网络延迟

      // 返回已收到的块的信息
      remoteUser.post(
        {
          kind: "response-chunk-result",
          hash,
        },
        {
          userSessionId: fromUserSessionId,
        }
      );

      progress &&
        progress({
          kind: "receiving-chunk",
          hash,
          progress:
            (currentReceivingFile.receivedChunks.length /
              currentReceivingFile.hashes.length) *
            100,
          receivedChunks: currentReceivingFile.receivedChunks,
        });
    }

    // 当块全部收到时，进行合并
    if (
      currentReceivingFile.receivedChunks.length ===
      currentReceivingFile.hashes.length
    ) {
      console.log("文件接收完成");

      // 合并文件
      const fileHandle = await handle.get(currentReceivingFile.name, {
        create: "file",
      });

      let contents = [];

      for (let hash of currentReceivingFile.hashes) {
        const chunkHandle = await chunksHandle.get(`${hash}`);
        const chunk = await chunkHandle.file();
        contents.push(chunk);
      }

      // 合并成完整的文件
      const blob = new Blob(contents);

      // 写入文件
      await fileHandle.write(blob);

      // 合并完成后，清空缓存文件
      for await (const entry of chunksHandle.values()) {
        await entry.remove();
      }
      return;
    }
  });
};
