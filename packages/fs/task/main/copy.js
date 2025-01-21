import { getErr } from "../errors.js";
import { calculateHash } from "../util.js";

// 按照块的模式，复制文件
export const copyTo = async (options) => {
  const { from: fHandle, to: tHandle, delayTime } = options;

  // 复制到目的地的文件名
  let finalName = options.name || fHandle.name;

  let hashResult = false; // 保证得到哈希值正确的数据
  let flatFileDatas;

  let errCount = 0; // 错误次数

  while (!hashResult) {
    // 获取扁平化的数据
    flatFileDatas = await fHandle._info();

    try {
      // 判断文件哈希表看是否正确
      await Promise.all(
        flatFileDatas.map(async ([path, item]) => {
          const { hashs1m, hash } = item;
          const reHash = await calculateHash(hashs1m.join(""));

          if (reHash !== hash) {
            errCount++;
            throw getErr("getHashErr", { path, count: errCount });
          }
        })
      );

      hashResult = true;
    } catch (err) {
      hashResult = false;

      if (options.error) {
        options.error(err);
      }

      if (errCount > 5) {
        throw getErr("getHashErr", { path, count: errCount });
      }
    }
  }

  if (fHandle.kind === "file") {
    flatFileDatas[0][1].afterPath = flatFileDatas[0][0];
  } else {
    let fromDirPath;
    if (fHandle._mark === "remote") {
      // 远程文件类型只取尾端
      fromDirPath = fHandle.path.split(":").slice(2).join(":");
    } else {
      fromDirPath = fHandle.path;
    }
    flatFileDatas.forEach(([path, info]) => {
      const afterPath = path.replace(`${fromDirPath}/`, "");
      info.afterPath = afterPath;
    });
  }

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

  await pkgHandle.write(
    JSON.stringify({
      type: "copy",
      from: fHandle.path,
      to: tHandle.path,
      flats: flatFileDatas,
    })
  );

  // 获取总块数量和总大小
  let totalCount = 0;
  let totalSize = 0;
  flatFileDatas.forEach(([path, item]) => {
    totalCount += item.hashs1m.length;
    totalSize += item.size;
  });
  let cachedCount = 0; // 缓存总块数
  let cachedSize = 0; // 缓存总大小

  // 缓冲块数据
  const cacheBlob = async ({ hash, handle, i }) => {
    // 判断是否已经缓存
    let cacheHandle = await targetCacheHandle.get(hash);

    if (cacheHandle) {
      const hashResult = await cacheHandle._dataHash();

      if (hash === hashResult) {
        cachedSize += await cacheHandle.size();
        return true;
      }

      // 哈希不一致，重新走复制流程
    }

    let finnalResult = false; // 复制块是否成功
    let loadCount = 0;

    let blobData; // 读取到的数据

    while (!finnalResult) {
      if (loadCount > 3) {
        // 重新读取了3次还是不行，就不要再读取了
        throw getErr("notFoundChunk", { path: handle.path, hash });
      }

      try {
        // 读取块数据
        const filePms = handle.file({
          start: i * 1024 * 1024,
          end: (i + 1) * 1024 * 1024,
        });

        // 添加超时机制，15秒后无法得到数据的情况，跑出超时错误
        let _innerResolve;
        const timeoutPms = new Promise((resolve) => {
          const timer = setTimeout(() => {
            resolve(new Error(`fetch blob timeout: ${hash}`));
          }, 15000);
          // }, 1000); // debug
          _innerResolve = () => {
            clearTimeout(timer);
            _innerResolve = null;
            resolve();
          };
        });

        const finnalResult = await Promise.race([filePms, timeoutPms]);

        if (finnalResult instanceof Error) {
          throw err;
        }

        _innerResolve && _innerResolve(null);

        blobData = await filePms;
      } catch (err) {
        // 加载报错，重新开始
        loadCount++;
        continue;
      }

      // 计算哈希值是否相等
      const hashResult = await calculateHash(blobData);

      if (hash !== hashResult) {
        // 哈希值不一样，重新复制
        loadCount++;
      } else {
        finnalResult = true;
      }
    }

    // 写入缓存数据
    cacheHandle = await targetCacheHandle.get(hash, {
      create: "file",
    });

    await cacheHandle.write(blobData);

    cachedSize += blobData.size;

    return true;
  };

  // 缓存文块数据
  const cacheFile = async (handle, path, info) => {
    if (!handle) {
      // TODO: 对面文件没有了，标识任务出错
      throw getErr("copyNoFile", { path });
    }

    const { afterPath, hashs1m } = info;

    const currentTotal = hashs1m.length;
    let currentCached = 0; // 当前文件的缓存块数量

    // 让发送块数据的线程保持在指定的数量
    const MaxRunCount = 4; // 最大线程数
    let running = 0; // 已经运行的线程数
    let waitingResolve, waitingReject;
    let waitingPms;
    // 重新设置等待的 Promise
    const resetWaiting = () => {
      waitingPms = new Promise((resolve, reject) => {
        waitingReject = (error) => {
          waitingPms = waitingResolve = waitingReject = null;
          reject(error);
        };
        waitingResolve = () => {
          running--;
          waitingPms = waitingResolve = waitingReject = null;
          resolve();
        };
      });
    };

    const allPms = []; // 所有的请求进程

    // 按照 1m 的格式，开始读取文件的块数据
    for (let i = 0; i < hashs1m.length; i++) {
      const hash = hashs1m[i];

      if (waitingPms) {
        const result = await waitingPms;

        if (result === false) {
          break;
        }
      }

      running++;

      if (running > MaxRunCount) {
        resetWaiting();
      }

      allPms.push(
        cacheBlob({ hash, handle, i })
          .then(async () => {
            cachedCount++;
            currentCached++;

            if (options.copy) {
              let result = options.copy({
                cached: cachedCount,
                total: totalCount,
                current: `${tHandle.path}/${finalName}/${afterPath}`,
                fromPath: path,
                currentCached,
                currentTotal,
                totalSize,
                cachedSize,
              });

              if (delayTime) {
                await new Promise((resolve) => setTimeout(resolve, delayTime));
              }

              if (result instanceof Promise) {
                result = await result;
              }

              if (waitingResolve) {
                waitingResolve(result);
              }
            }
          })
          .catch((err) => {
            waitingReject && waitingReject(err);
          })
      );
    }

    await Promise.all(allPms); // 保证全部块都缓存完才进行下一步
  };

  if (fHandle.kind === "dir") {
    // 按照1m的大小，开始逐个复制文件夹信息
    for (let [path, info] of flatFileDatas) {
      const { afterPath } = info;

      // 最终写入文件地址
      const handle = await fHandle.get(afterPath);

      await cacheFile(handle, path, info);
    }
  } else {
    const path = flatFileDatas[0][0];
    const info = flatFileDatas[0][1];
    await cacheFile(fHandle, path, info);
  }

  // 最终目标文件
  let targetHandle;

  // 将缓存文件组合成完整的文件
  if (fHandle.kind === "dir") {
    // 目标文件夹
    targetHandle = await tHandle.get(finalName, {
      create: "dir",
    });

    await targetHandle._mergeChunks({
      flatFileDatas,
      delayTime,
      merge: options.merge,
    });
  } else {
    // 目标文件文件
    targetHandle = await tHandle.get(finalName, {
      create: "file",
    });

    await targetHandle._mergeChunks({
      flatFileDatas,
      delayTime,
      merge: options.merge,
    });
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
