import { calculateFileChunkHashes, getHash } from "/packages/fs/util.js";
import { setting } from "/packages/fs/fs-remote/file.js";

// 专门用于复制到远端设备中的方法
export const copyTo = ({
  localUser,
  files,
  fromUserId,
  fromSessionId,
  progress,
  end,
}) => {
  const controller = new AbortController();

  const cancel = localUser.register("response-chunk", (e) => {
    const { data, fromUserId, fromUserSessionId } = e.detail;

    debugger;
  });

  (async () => {
    // 获取远端用户
    const remoteUser = await localUser.connectUser(fromUserId);

    for (let file of files) {
      // 然后开始发送小块给对方
      await sendFile({
        signal: controller.signal,
        file,
        remoteUser,
        userSessionId: fromSessionId,
      });
    }
  })();

  return () => {
    cancel();
    controller.abort();
  };
};

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

    // 不明情况
  });
};
