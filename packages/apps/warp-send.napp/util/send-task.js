import { setting } from "/packages/fs/fs-remote/file.js";
import { getHash } from "/packages/util/hash/main.js";

/**
 * 初始化发送任务
 * @param {Object} params - 参数对象
 * @param {Object} params.localUser - 本地用户对象
 * @param {Object} params.remoteUser - 远程用户对象
 * @param {string} params.taskHash - 任务哈希值
 * @param {Array} params.files - 文件数组
 * @param {Function} params.callback - 回调函数
 * @returns {Object} 包含取消函数的对象
 */
export const startSendTask = async ({
  localUser,
  remoteUser,
  taskHash,
  files,
  callback,
}) => {
  // TODO: 实现发送任务初始化
  console.log("正在初始化发送任务:", { localUser, taskHash, files });

  const fileMap = new Map(files.map((file) => [file.hash, file]));

  let sessionId = null;

  // 监听文件接受的情况
  const unsubscribeAckListener = localUser.bind("receive-data", async (e) => {
    const { data, fromUserId, fromUserSessionId } = e.detail;

    if (fromUserSessionId === sessionId && fromUserId === remoteUser.userId) {
      const { fileHash, chunkHash, kind } = data;

      if (kind === "request-chunk") {
        // 查找到目标文件，并切取块进行发送
        const targetItem = fileMap.get(fileHash);

        if (!targetItem) {
          console.error(`未找到文件哈希值为 ${fileHash} 的文件`);
          return;
        }

        const chunkIndex = targetItem.hashes.indexOf(chunkHash);

        if (chunkIndex === -1) {
          console.error(`未找到块哈希值为 ${chunkHash} 的文件块`);
          return;
        }

        // 调用回调函数通知开始发送块
        if (callback) {
          callback({
            type: "send-chunk",
            fileHash,
            name: targetItem.name,
            sent: chunkIndex, // 当前发送的块索引
            total: targetItem.hashes.length, // 总块数
          });
        }

        const chunk = await targetItem._file.slice(
          chunkIndex * setting.chunkSize,
          (chunkIndex + 1) * setting.chunkSize
        );

        // debug: 添加延迟方便调试
        // await new Promise((resolve) => setTimeout(resolve, 200));

        // 发送给对方
        remoteUser.post(
          {
            kind: "file-chunk",
            fileHash,
            chunkHash,
            taskHash,
            chunk: new Uint8Array(await chunk.arrayBuffer()),
          },
          sessionId
        );

        // 检查是否是最后一个块，如果是则调用文件发送完成的回调
        if (chunkIndex === targetItem.hashes.length - 1 && callback) {
          callback({
            type: "file-sent",
            fileHash,
            name: targetItem.name,
            sent: targetItem.hashes.length,
            total: targetItem.hashes.length,
          });
        }
      }
    }
  });

  // 锁定双方的sessionId
  const cancel = localUser.register(
    `warp-confirm-both-session-${taskHash}-${remoteUser.userId}`,
    (e) => {
      sessionId = e.fromUserSessionId;

      // 想对方发送确认信息
      remoteUser.post(
        {
          kind: "confirm-both-session",
          taskHash,
        },
        sessionId
      );

      cancel();
    }
  );

  return {
    unsubscribe: unsubscribeAckListener,
  };
};
