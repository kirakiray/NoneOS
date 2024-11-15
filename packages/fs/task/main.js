import { calculateHash } from "../util.js";

// 所有任务
export const tasks = $.stanz([]);

// 添加任务
export const addTask = async ({ type, from, to, delayTime }) => {
  tasks.push({
    type,
    from,
    to,
    delayTime,
    path: "", // 任务目录的地址
    paused: false, // 是否暂停中
    showViewer: true, // 是否显示查看器
    done: false, // 任务是否已经完成
    step: 1, // 1块拷贝中 2合并中 3清理中
    precentage: 0, // 任务进行率 0-1
  });
};

// 按照块的模式，复制文件
export const copyTo = async (options) => {
  const { from: fHandle, to: tHandle, delayTime } = options;

  // 复制到目的地的文件名
  let finalName = options.name || fHandle.name;

  // 获取扁平化的数据
  const flatFileDatas = await fHandle._info();

  if (fHandle.kind === "file") {
    debugger;
    return;
  }

  const fromDirPath = fHandle.path;
  flatFileDatas.forEach(([path, info]) => {
    const afterPath = path.replace(`${fromDirPath}/`, "");
    info.afterPath = afterPath;
  });

  // 确认信息
  if (options.confirm) {
    const result = await options.confirm(
      JSON.parse(JSON.stringify(flatFileDatas))
    );

    if (result === false) {
      return;
    }
  }

  // 复制到这个缓存目录
  const targetCacheHandle = await tHandle.get(`${finalName}.fs_task_cache`, {
    create: "dir",
  });

  // 保存一份进度信息
  const pkgHandle = await targetCacheHandle.get("task.json", {
    create: "file",
  });

  await pkgHandle.write(JSON.stringify(flatFileDatas));

  // 获取总块数量
  let totalCount = 0;
  flatFileDatas.forEach(([path, item]) => {
    totalCount += item.hashs1m.length;
  });
  let cachedCount = 0;

  // 按照1m的大小，开始逐个复制文件夹信息
  for (let [path, info] of flatFileDatas) {
    const { hashs1m, afterPath } = info;

    // 最终写入文件地址
    const handle = await fHandle.get(afterPath);

    if (!handle) {
      // TODO: 对面文件没有了，标识任务出错
      debugger;
      throw new Error("no file here");
    }

    const blobs = (info.blobs = {});

    const currentTotal = hashs1m.length;
    let currentCached = 0;

    // 按照 1m 的格式，开始读取文件的块数据
    for (let i = 0; i < hashs1m.length; i++) {
      const hash = hashs1m[i];

      // 判断是否已经缓存
      let cacheHandle = await targetCacheHandle.get(hash);

      if (cacheHandle) {
        // 重新验证文件哈希是否正确
        const cachedBlob = await cacheHandle.file();

        const hashResult = await calculateHash(cachedBlob);

        if (hash !== hashResult) {
          // TODO: 哈希值不一样，继续重试
          debugger;
        }

        blobs[hash] = cachedBlob;

        if (options.copy) {
          cachedCount++;
          currentCached++;

          const result = options.copy({
            cached: cachedCount,
            total: totalCount,
            current: `${tHandle.path}/${finalName}/${afterPath}`,
            fromPath: path,
            currentCached,
            currentTotal,
            isCache: true,
          });

          if (result === false) {
            // TODO: 停止复制过程
            debugger;
          }
        }

        // 哈希一样，直接继续下一个块的复制
        continue;
      }

      // 读取块数据
      const blobData = await handle.file({
        start: i * 1024 * 1024,
        end: (i + 1) * 1024 * 1024,
      });

      // 计算哈希值是否相等
      const hashResult = await calculateHash(blobData);

      if (hash !== hashResult) {
        // TODO: 哈希值不一样，继续重试
        debugger;
        continue;
      }

      // 写入缓存数据
      cacheHandle = await targetCacheHandle.get(hash, {
        create: "file",
      });

      await cacheHandle.write(blobData);

      blobs[hash] = blobData;

      if (options.copy) {
        cachedCount++;
        currentCached++;

        const result = options.copy({
          cached: cachedCount,
          total: totalCount,
          current: `${tHandle.path}/${finalName}/${afterPath}`,
          fromPath: path,
          currentCached,
          currentTotal,
        });

        if (delayTime) {
          await new Promise((resolve) => setTimeout(resolve, delayTime));
        }

        if (result === false) {
          // TODO: 停止复制过程
          debugger;
        }
      }
    }
  }

  // 最终目标文件
  let targetHandle;

  if (fHandle.kind === "file") {
    // 直接写入文件
    debugger;
    return;
  } else {
    // 目标文件夹
    targetHandle = await tHandle.get(finalName, {
      create: "dir",
    });

    let count = 0;
    // 根据信息开始合并文件
    for (let [path, info] of flatFileDatas) {
      const { afterPath } = info;

      const { blobs, hashs1m } = info;

      const fileBlobs = hashs1m.map((hash) => {
        if (!blobs[hash]) {
          // TODO: 块数据没有找到，需要重新复制
          debugger;
          throw new Error("no blob here");
        }

        return blobs[hash];
      });

      // 合并块数据并写入到最终目标文件中
      const handle = await targetHandle.get(afterPath, {
        create: "file",
      });

      await handle.write(new Blob(fileBlobs));

      count++;

      if (options.merge) {
        options.merge({
          path: handle.path,
          fromPath: path,
          count,
          total: flatFileDatas.length,
        });
      }

      if (delayTime) {
        await new Promise((resolve) => setTimeout(resolve, delayTime));
      }
    }
  }
  {
    // 删除缓存文件
    let removed = 0;
    const totalCount = await targetCacheHandle.length();

    await targetCacheHandle.remove((e) => {
      removed++;
      if (options.clear) {
        options.clear({
          ...e,
          removed,
          total: totalCount + 1,
        });
      }
    });
  }

  return targetHandle;
};
