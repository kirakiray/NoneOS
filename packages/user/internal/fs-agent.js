import { get } from "/packages/fs/main.js";
import { getHash, getFileChunkHashes } from "/packages/util/hash/main.js";
import { getChunk } from "/packages/chunk/main.js";

import { setting } from "/packages/fs/fs-remote/file.js";

export default async function fsAgent({
  fromUserId,
  fromUserSessionId,
  data,
  server,
  localUser,
}) {
  const result = await localUser.isMyDevice(fromUserId);

  const remoteUser = await localUser.connectUser(fromUserId);

  const { name, path, args, taskId } = data;

  // 返回任务结果给对方
  const returnData = async (data, blob) => {
    const basePayload = {
      _type: "response-fs-agent",
      taskId,
      ...data,
    };

    if (blob) {
      remoteUser.post(new Uint8Array(await blob.arrayBuffer()), {
        ...basePayload,
        userSessionId: fromUserSessionId,
      });
      return;
    }

    remoteUser.post(basePayload, {
      userSessionId: fromUserSessionId,
    });
  };

  if (!result) {
    // 如果不是我的设备，返回错误
    await returnData({
      error: {
        message: "Not my device",
      },
    });
    return;
  }

  try {
    // 当仅有 hash 信息而缺少来源信息时，表明这是主动保存的数据，可从通过 write 操作写入的缓存中获取
    if (name === "get-file-chunk" && path === undefined && data.hash) {
      const { chunk } = await getChunk({ hash: data.hash, remoteUser });

      if (!chunk) {
        throw new Error(`Chunk not found. Hash: ${data.hash}`);
      }

      // 发送成功结果回去
      await returnData({}, chunk);
      return;
    }

    // 如果没有路径信息且不是通过hash获取chunk的请求，则返回错误
    if (!path) {
      throw new Error("Path is required for this operation");
    }

    const targetHandle = await get(path);

    // 获取文件的 hash 信息
    if (name === "get-file-hash") {
      const file = await targetHandle.file();

      let hashes = [];

      let { start, end } = data.options || {};

      if (start === undefined && end === undefined) {
        hashes = await getFileChunkHashes(file, {
          chunkSize: setting.chunkSize,
        });
      } else {
        // 设置默认值并确保边界正确
        start = Math.max(0, start || 0);
        end = Math.min(file.size, end || file.size);

        const { chunkSize } = setting;

        // 根据范围计算块的哈希值
        for (let i = 0; i < file.size; i += chunkSize) {
          // 若当前块在指定范围内，则计算其哈希值并加入 hashes 数组；若不在范围内，则以 0 填充
          if (i > start - chunkSize && i < end) {
            const chunk = file.slice(i, i + chunkSize);
            const hash = await getHash(chunk);
            hashes.push(hash);
          } else {
            hashes.push(0);
          }
        }
      }

      const size = file.size;
      const lastModified = await targetHandle.lastModified();

      // 发送成功结果回去
      await returnData({
        result: {
          chunkSize: setting.chunkSize, // 每个 chunk 的大小
          hashes,
          size,
          lastModified,
          type: file.type,
        },
      });

      return;
    }

    // 根据信息获取块数据
    if (name === "get-file-chunk") {
      const { hash, index, chunkSize } = data;

      const file = await targetHandle.file();

      const chunk = await file.slice(
        index * chunkSize,
        (index + 1) * chunkSize
      );

      // 计算hash
      const chunkHash = await getHash(chunk);

      // 对比hash
      if (chunkHash !== hash) {
        throw new Error(
          `Hash not match. Path: ${path}, Index: ${index}, Expected: ${hash}, Actual: ${chunkHash}`
        );
      }

      await returnData({}, chunk);
      return;
    }

    if (name === "write-file-chunk") {
      const { hashes } = data;

      // 从块模块上获取文件内容
      const chunks = await Promise.all(
        hashes.map(async (hash) => {
          const { chunk } = await getChunk({ hash, remoteUser });
          return new Blob([chunk]);
        })
      );

      // 写入文件
      await targetHandle.write(new Blob(chunks));

      await returnData({
        result: true,
      });
      return;
    }

    if (name === "observe") {
      const { obsId } = data;

      if (!obsId) {
        throw new Error("obsId is required for observe operation");
      }

      const cancel = await targetHandle.observe((e) => {
        const { path, type, remark } = e;

        remoteUser.post(
          {
            type: "receive-observe",
            obsId,
            options: { path, type, remark },
            __internal_mark: 1,
          },
          {
            userSessionId: fromUserSessionId,
          }
        );
      });

      remoteObservePool.set(obsId, {
        cancel,
        fromUserSessionId,
        fromUserId,
      });

      await returnData({});
      return;
    }

    if (name === "cancel-observe") {
      const { obsId } = data;

      if (!obsId) {
        throw new Error("obsId is required for cancel-observe operation");
      }

      const observer = remoteObservePool.get(obsId);
      if (!observer) {
        throw new Error(`No observer found for obsId: ${obsId}`);
      }

      const { cancel } = observer;

      cancel();
      remoteObservePool.delete(obsId);

      await returnData({});
      return;
    }

    if (name === "keys") {
      // 验证targetHandle是否支持keys方法
      const keys = [];
      for await (let key of targetHandle.keys()) {
        keys.push(key);
      }

      await returnData({
        result: keys,
      });
      return;
    }

    const result = await targetHandle[name](...(args || []));

    // 发送成功结果回去
    await returnData({
      result,
    });
  } catch (error) {
    // 发送错误信息回去
    await returnData({
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
    });
  }
}

const remoteObservePool = new Map();

// TODO: 定时检查 fromUserSessionId 是否过期，清除 remoteObservePool 中过期的项
