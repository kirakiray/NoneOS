import { get } from "/packages/fs/main.js";
import { getHash, calculateFileChunkHashes } from "/packages/fs/util.js";
import { getChunk } from "/packages/chunk/main.js";

import { setting } from "/packages/fs/re-remote/file.js";

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

  if (!result) {
    // 如果不是我的设备，返回错误
    remoteUser.post(
      {
        _type: "response-fs-agent",
        taskId,
        error: {
          message: "Not my device",
        },
      },
      {
        userSessionId: fromUserSessionId,
      }
    );
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
      remoteUser.post(new Uint8Array(await chunk.arrayBuffer()), {
        _type: "response-fs-agent",
        taskId,
        userSessionId: fromUserSessionId,
      });

      return;
    }

    const targetHandle = await get(path);

    // 获取文件的 hash 信息
    if (name === "get-file-hash") {
      const file = await targetHandle.file();

      let hashes = [];

      let { start, end } = data.options || {};

      if (start === undefined && end === undefined) {
        hashes = await calculateFileChunkHashes(file, {
          chunkSize: setting.chunkSize,
        });
      } else {
        if (start === undefined) {
          start = 0;
        }
        if (end === undefined) {
          end = file.size;
        }
        start = Math.max(0, start);
        end = Math.min(file.size, end);

        const { chunkSize } = setting;

        // 根据范围缓存块的
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
      remoteUser.post(
        {
          _type: "response-fs-agent",
          taskId,
          result: {
            chunkSize: setting.chunkSize, // 每个 chunk 的大小
            hashes,
            size,
            lastModified,
            type: file.type,
          },
        },
        {
          userSessionId: fromUserSessionId,
        }
      );

      return;
    }

    // 根据信息获取块数据
    if (name === "get-file-chunk") {
      const { hash, index, chunkSize } = data;

      const file = await targetHandle.file();
      console.log("get-file-chunk: ", file, file.size);

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

      remoteUser.post(new Uint8Array(await chunk.arrayBuffer()), {
        _type: "response-fs-agent",
        taskId,
        userSessionId: fromUserSessionId,
      });
      return;
    }

    if (name === "write-file-chunk") {
      const { hashes } = data;

      const chunks = [];

      // 从块模块上获取文件内容
      for (let i = 0; i < hashes.length; i++) {
        const hash = hashes[i];
        const { chunk } = await getChunk({ hash, remoteUser });

        chunks.push(new Blob([chunk]));
      }

      // 写入文件
      await targetHandle.write(new Blob(chunks));

      remoteUser.post(
        {
          _type: "response-fs-agent",
          taskId,
          result: true,
        },
        {
          userSessionId: fromUserSessionId,
        }
      );
      return;
    }

    if (name === "observe") {
      const { obsId } = data;

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

      remoteUser.post(
        {
          _type: "response-fs-agent",
          taskId,
        },
        {
          userSessionId: fromUserSessionId,
        }
      );
      return;
    }

    if (name === "cancel-observe") {
      const { obsId } = data;

      const { cancel } = await remoteObservePool.get(obsId);

      cancel();
      remoteObservePool.delete(obsId);

      remoteUser.post(
        {
          _type: "response-fs-agent",
          taskId,
        },
        {
          userSessionId: fromUserSessionId,
        }
      );
      return;
    }

    if (name === "keys") {
      const keys = [];
      for await (let key of targetHandle.keys()) {
        keys.push(key);
      }

      remoteUser.post(
        {
          _type: "response-fs-agent",
          taskId,
          result: keys,
        },
        {
          userSessionId: fromUserSessionId,
        }
      );
      return;
    }

    const result = await targetHandle[name](...(args || []));

    // 发送成功结果回去
    remoteUser.post(
      {
        _type: "response-fs-agent",
        taskId,
        result,
      },
      {
        userSessionId: fromUserSessionId,
      }
    );
  } catch (error) {
    // 发送错误信息回去
    remoteUser.post(
      {
        _type: "response-fs-agent",
        taskId,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      },
      {
        userSessionId: fromUserSessionId,
      }
    );
  }
}

const remoteObservePool = new Map();

// TODO: 定时检查 fromUserSessionId 是否过期，清除 remoteObservePool 中过期的项
