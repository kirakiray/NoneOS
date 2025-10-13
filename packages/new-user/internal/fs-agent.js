import { get } from "../../../packages/fs/main.js";
import {
  calculateFileChunkHashes,
  getHash,
} from "../../../packages/fs/util.js";

export default async function fsAgent({
  fromUserId,
  fromUserSessionId,
  data,
  server,
  localUser,
}) {
  const result = await localUser.isMyDevice(fromUserId);

  if (!result) {
    // 如果不是我的设备，返回错误
    remoteUser.post({
      _type: "response-fs-agent",
      taskId,
      error: {
        message: "Not my device",
      },
    });
    return;
  }

  const remoteUser = await localUser.connectUser(fromUserId);

  const { name, path, args, taskId } = data;

  try {
    const targetHandle = await get(path);

    if (name === "get-file-hash") {
      const file = await targetHandle.file();
      const hashes = await calculateFileChunkHashes(file);
      const size = file.size;

      // 发送成功结果回去
      remoteUser.post({
        _type: "response-fs-agent",
        taskId,
        result: {
          chunkSize: 192, // 每个 chunk 的大小，单位kb
          hashes,
          size,
        },
      });

      return;
    } else if (name === "get-file-chunk") {
      const { hash, index, chunkSize } = data;
      const realChunkSize = chunkSize * 1024; // 转换为字节

      const file = await targetHandle.file();
      const chunk = await file.slice(
        index * realChunkSize,
        (index + 1) * realChunkSize
      );

      // 计算hash
      const chunkHash = await getHash(chunk);

      // 对比hash
      if (chunkHash !== hash) {
        throw new Error(
          `Hash not match. Path: ${path}, Index: ${index}, Expected: ${hash}, Actual: ${chunkHash}`
        );
      }

      remoteUser.post(new Uint8Array(await chunk.arrayBuffer()), {
        _type: "response-fs-agent",
        taskId,
      });
      return;
    }

    const result = await targetHandle[name](...(args || []));

    // 发送成功结果回去
    remoteUser.post({
      _type: "response-fs-agent",
      taskId,
      result,
    });
  } catch (error) {
    // 发送错误信息回去
    remoteUser.post({
      _type: "response-fs-agent",
      taskId,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
    });
  }
}
