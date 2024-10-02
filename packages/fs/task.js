import { flatHandle } from "./util.js";
import { getErr } from "./errors.js";
import { CHUNK_SIZE, CHUNK_REMOTE_SIZE } from "./util.js";

// 用于监听任务进度
const listener = new EventTarget();

export const on = (name, func) => {
  listener.addEventListener(name, func);
};

export const off = (name, func) => {
  listener.removeEventListener(name, func);
};

const emit = (name, data) => {
  const event = new Event(name);
  event.data = data;
  listener.dispatchEvent(event);
};

// 通过进度的模式，将文件从源拷贝到目标
export const copyTo = async ({
  source,
  target,
  confirm,
  progress,
  name,
  chunkSize, // 分块的大小
  debugTime = 0, // 调试用的延迟时间
}) => {
  if (!name) {
    name = source.name;
  }

  // 修正块的大小
  if (!chunkSize) {
    if (source._mark === "remote" || target._mark === "remote") {
      chunkSize = CHUNK_REMOTE_SIZE;
    } else {
      chunkSize = CHUNK_SIZE;
    }
  }

  // 先扁平化所有文件
  const files = await flatHandle(source);

  if (confirm) {
    const result = await confirm(files);

    if (!result) {
      return;
    }
  }

  let totalChunkSize = 0; // 块的数量
  let count = 0;

  // 先计算目标的所有的文件，并计算所有块数据，切块按照 1mb 的大小获取hash
  await Promise.all(
    files.map(async (e) => {
      const result = await e.handle._getHashMap({
        size: chunkSize,
      });

      totalChunkSize += result.length - 1;

      e.hashs = result.slice(1);
    })
  );

  // 建立一个复制专用的文件夹
  const cacheDir = await target.get(`${name}.fs_task_cache`, {
    create: "dir",
  });

  // 备份文件数据
  const taskFile = await cacheDir.get("task.json", {
    create: "file",
  });

  const taskFileData = {
    type: "copyTo",
    step: "copy",
    files,
    from: source.path,
    to: target.path,
  };

  // 保存步骤
  await taskFile.write(JSON.stringify(taskFileData));

  // 将块复制到缓存文件夹
  for (let item of files) {
    const { hashs } = item;

    for (let i = 0; i < hashs.length; i++) {
      const hash = hashs[i];

      // 确认没有缓存
      const cacheChunk = await cacheDir.get(hash);

      const eventOptions = {
        hash,
        index: i,
        path: item.path,
        total: totalChunkSize,
        count,
      };

      if (cacheChunk) {
        // 已经存在的不用再拷贝
        const size = await cacheChunk.size();

        if (size) {
          // 已经写入成功的就不折腾了
          count++;

          progress &&
            progress({
              type: "writed",
              ...eventOptions,
              count,
              exited: 1, // 已经存在的块
            });

          emit("writed", {
            ...eventOptions,
            count,
            exited: 1, // 已经存在的块
          });
          continue;
        }
      }

      // 获取块数据
      const chunk = await item.handle._getChunk(hash, i, chunkSize);

      progress &&
        progress({
          type: "before-write",
          ...eventOptions,
        });

      emit("before-write", {
        ...eventOptions,
      });

      // 写入块
      const chunkFile = await cacheDir.get(hash, { create: "file" });
      await chunkFile.write(chunk);

      if (debugTime) {
        await new Promise((res) => setTimeout(res, debugTime));
      }

      count++; // 写入成功后递增

      progress &&
        progress({
          type: "writed",
          ...eventOptions,
          count,
        });

      emit("writed", {
        ...eventOptions,
        count,
      });
    }
  }

  // 记录到组装步骤
  taskFileData.step == "merge";
  await taskFile.write(JSON.stringify(taskFileData));

  const needClearItem = []; // 需要被清除的哈希

  const writeFile = async (fileHandle, item) => {
    const writer = await fileHandle.createWritable();

    for (let hash of item.hashs) {
      const handle = await cacheDir.get(hash);
      if (!handle) {
        const err = get("notFoundChunk", {
          path: item.path,
          hash,
        });
        console.error(err);
        await writer.abort();
        break;
      }
      const data = await handle.buffer();
      await writer.write(data);
    }

    needClearItem.push(item);

    await writer.close();
  };

  // 复制完成后，将块重新进行组装
  if (source.kind === "file") {
    // 文件拼接
    const fileHandle = await target.get(name, { create: "file" });

    await writeFile(fileHandle, files[0]);
  } else {
    // 文件夹内的拼接
    for (let item of files) {
      const path = item.path.replace(`${source.path}/`, "");
      const fileHandle = await target.get(`${name}/${path}`, {
        create: "file",
      });

      await writeFile(fileHandle, item);
    }
  }

  // 记录到清除步骤
  taskFileData.step == "clear";
  await taskFile.write(JSON.stringify(taskFileData));

  // 清除缓存
  for (let item of needClearItem) {
    for (let hash of item.hashs) {
      const handle = await cacheDir.get(hash);

      if (handle) {
        await handle.remove();
      }
    }
  }

  // 如果没有缓存块，就可以删除对应的目录
  const len = await cacheDir.length();
  if (len === 1) {
    // 只剩下task.json 文件
    await cacheDir.remove();
  }
};
