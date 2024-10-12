import { flatHandle } from "./util.js";
import { getErr } from "./errors.js";
import { CHUNK_SIZE, CHUNK_REMOTE_SIZE } from "./util.js";

// 用于监听任务进度
const listener = new EventTarget();

export const on = (name, func) => {
  listener.addEventListener(name, func);

  return () => {
    listener.removeEventListener(name, func);
  };
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
  prepare,
  name,
  chunkSize, // 分块的大小
  debugTime, // 调试用的延迟时间
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

  // 添加目标地址
  {
    const targetPath = target.path;
    const sourcePath = source.path;
    files.forEach((e) => {
      e.to = `${targetPath}/${name}${e.path.replace(sourcePath, "")}`;
    });
  }

  if (confirm) {
    const result = await confirm(files);

    if (!result) {
      return;
    }
  }

  let totalLength = 0; // 块的数量
  let count = 0;

  // 先计算目标的所有的文件，并计算所有块数据，切块按照 1mb 的大小获取hash
  await Promise.all(
    files.map(async (e) => {
      const result = await e.handle._getHashMap({
        size: chunkSize,
      });

      totalLength += result.length - 1;

      e.hashs = result.slice(1);
    })
  );

  // 建立一个复制专用的文件夹
  const cacheDir = await target.get(`.${name}.fs_task_cache`, {
    create: "dir",
  });

  const cachePath = cacheDir.path;

  // 备份文件数据
  const taskFile = await cacheDir.get("task.json", {
    create: "file",
  });

  // 内部用的事件触发器，会项 progress 和 全局触发对应的事件
  const emitEvent = (name, data) => {
    progress &&
      progress({
        type: name,
        cachePath,
        ...data,
      });

    emit(name, {
      cachePath,
      ...data,
    });
  };

  if (prepare) {
    await prepare({
      path: cachePath,
    });

    emitEvent("prepare", {
      path: cachePath,
      source,
      target,
    });
  }

  const taskFileData = {
    type: "copyTo",
    files,
    from: source.path,
    to: target.path,
  };

  // 保存步骤
  await taskFile.write(JSON.stringify(taskFileData));

  const mergingTasks = []; // 合并中的任务

  const runItem = async (item) => {
    // // 查看是否已经合并，已合并就不操作
    // const file = await target 
    //   .get(`${name}${item.path.replace(source.path, "")}`)
    //   .catch(() => null);

    // const size = file ? await file.size() : 0;

    // if (size) {
    //   count += item.hashs.length;

    //   emitEvent("writed", {
    //     path: item.path,
    //     total: totalLength,
    //     totalCached: count, // 整个项目缓存的块数量
    //     currentCached: item.hashs.length, // 当前文件缓存的块数量
    //     currentLength: item.hashs.length, // 当前文件的总块数
    //     exited: 1, // 已经存在的块
    //   });

    //   emitEvent("merged", {
    //     item,
    //   });

    //   return;
    // }

    // 复制块文件
    await copyChunk({
      item,
      cacheDir,
      totalLength,
      chunkSize,
      emitEvent,
      debugTime,
      addTotalCount() {
        count++;
      },
      getTotalCached() {
        return count;
      },
    });

    emitEvent("before-merge", {
      item,
    });

    // 合并块文件
    mergingTasks.push(
      mergeChunk({
        item,
        cacheDir,
        source,
        target,
        name,
      }).then(() => {
        emitEvent("merged", {
          item,
        });
      })
    );
  };

  // 将块复制到缓存文件夹
  // for (let item of files) {
  //   await runItem(item);
  // }

  // 将块复制到缓存文件夹（并行）
  await Promise.all(
    files.map(async (item) => {
      await runItem(item);
    })
  );

  // 等待合并结束
  await Promise.all(mergingTasks);

  const cacheLen = await cacheDir.length();

  let removedCount = 0;

  for await (let handle of cacheDir.values()) {
    // 确保先不要删除任务主文件
    if (handle.name === "task.json") {
      continue;
    }

    await handle.remove();
    removedCount++;

    emitEvent("clear-cache", {
      removed: removedCount,
      total: cacheLen,
    });
  }

  // 最后清除任务文件夹自身
  await cacheDir.remove();

  // 触发完成事件
  emitEvent("task-complete", {
    path: cachePath,
  });
};

// 合并块文件
const mergeChunk = async ({ item, cacheDir, source, target, name }) => {
  let fileHandle;
  if (source.kind === "file") {
    // 文件拼接
    fileHandle = await target.get(name, { create: "file" });
  } else {
    // 文件夹内的拼接
    const path = item.path.replace(`${source.path}/`, "");
    fileHandle = await target.get(`${name}/${path}`, {
      create: "file",
    });
  }

  // 抛去根目录，获取相对地址
  const relateRootPath = cacheDir.path.split("/").slice(1).join("/");

  // 用自带的合并文件方法
  const result = await fileHandle._mergeChunk(item.hashs, relateRootPath);

  return result;
};

// 拷贝块文件
const copyChunk = async ({
  item,
  cacheDir,
  totalLength,
  emitEvent,
  chunkSize,
  addTotalCount,
  debugTime,
  getTotalCached,
}) => {
  const { hashs } = item;

  const currentLength = hashs.length;
  let currentCached = 0;

  for (let i = 0; i < hashs.length; i++) {
    const hash = hashs[i];

    // 确认没有缓存
    const cachedChunk = await cacheDir.get(hash);

    const eventOptions = {
      hash,
      index: i,
      path: item.path,
      total: totalLength,
      totalCached: getTotalCached(), // 整个项目缓存的块数量
      currentCached, // 当前文件缓存的块数量
      currentLength, // 当前文件的总块数
    };

    if (cachedChunk) {
      // 已经存在的不用再拷贝
      const size = await cachedChunk.size();

      if (size) {
        // 已经写入成功的就不折腾了
        addTotalCount();
        currentCached++;

        emitEvent("writed", {
          ...eventOptions,
          totalCached: getTotalCached(),
          currentCached,
          exited: 1, // 已经存在的块
        });
        continue;
      }
    }

    // 获取块数据
    const chunk = await item.handle._getChunk(hash, i, chunkSize);

    emitEvent("before-write", {
      ...eventOptions,
    });

    // 写入块
    const chunkFile = await cacheDir.get(hash, { create: "file" });
    await chunkFile.write(chunk);

    if (debugTime) {
      await new Promise((res) => setTimeout(res, debugTime));
    }

    addTotalCount(); // 写入成功后递增
    currentCached++;

    emitEvent("writed", {
      totalCached: getTotalCached(),
      currentCached,
      ...eventOptions,
    });
  }
};
