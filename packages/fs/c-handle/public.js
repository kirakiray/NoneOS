// 添加一个保存操作跟踪器
const savingOperations = new Map();

// 保存
export const saveCache = async ({ cache, path, data, type }) => {
  // 规范化路径
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  try {
    // 创建一个 Promise 用于跟踪保存操作
    const savePromise = new Promise(async (resolve, reject) => {
      try {
        const content = type === "dir" ? JSON.stringify(data) : data;
        const resp = new Response(content, {
          headers: {
            "x-type": type,
            "cache-control": "no-cache",
          },
        });
        await cache.put(normalizedPath, resp);
        resolve();
      } catch (error) {
        reject(error);
      }
    });

    // 将保存操作添加到跟踪器
    savingOperations.set(normalizedPath, savePromise);

    // 等待保存完成
    await savePromise;
  } finally {
    // 操作完成后删除跟踪
    savingOperations.delete(normalizedPath);
  }
};

export const getCache = async (cache, path) => {
  // 规范化路径
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // 检查是否有正在进行的保存操作
  const pendingSave = savingOperations.get(normalizedPath);
  if (pendingSave) {
    // 等待保存操作完成
    await pendingSave;
  }

  const matched = await cache.match(normalizedPath);

  if (!matched) {
    return {
      type: null,
      data: null,
    };
  }

  const type = matched.headers.get("x-type");

  try {
    // 获取 readsteam 数据
    const blob = await streamToBlob(matched.body);

    // 根据类型处理数据
    const data = type === "dir" ? JSON.parse(await blob.text()) : blob;

    return {
      type,
      data,
    };
  } catch (error) {
    console.error("Error processing cache data:", error);
    return {
      type: null,
      data: null,
      error: error.message,
    };
  }
};

// 确保缓存
export const ensureCache = async ({ cache, path, type: enType }) => {
  const { type, data } = await getCache(cache, path);

  if (type) {
    console.log("已存在缓存 ", path, "类型:", type, "数据:", data);
    return data;
  }

  let finalData = null;
  if (enType === "dir") {
    finalData = [];
  } else if (enType === "file") {
    finalData = "";
  }

  console.log(`新创建路径: ${path}, 类型: ${enType}`);
  await saveCache({
    type: enType,
    cache,
    data: finalData,
    path,
  });
};

// 添加一个目录更新锁跟踪器
const dirUpdateLocks = new Map();

// 目录添加子目录或子文件信息
export const updateDir = async ({ cache, path, remove, add }) => {
  // 规范化路径
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // 检查是否有正在进行的更新操作
  let releaseLock;
  try {
    // 等待获取锁
    if (dirUpdateLocks.has(normalizedPath)) {
      await dirUpdateLocks.get(normalizedPath);
    }

    // 创建新的锁
    const lockPromise = new Promise((resolve) => {
      releaseLock = resolve;
    });
    dirUpdateLocks.set(normalizedPath, lockPromise);

    // 获取当前目录的缓存数据
    const { data: currentData } = await getCache(cache, normalizedPath);

    // 如果目录不存在，抛出错误
    if (!currentData) {
      throw new Error(`目录不存在: ${normalizedPath}`);
    }

    // 创建目录数据的副本
    let updatedData = Array.isArray(currentData) ? [...currentData] : [];

    // 处理需要移除的项目
    if (remove && remove.length > 0) {
      updatedData = updatedData.filter((item) => !remove.includes(item));
    }

    // 处理需要添加的项目
    if (add && add.length > 0) {
      // 过滤掉已存在的项目，避免重复
      const newItems = add.filter((item) => !updatedData.includes(item));
      updatedData = [...updatedData, ...newItems];
    }

    // 保存更新后的目录数据
    await saveCache({
      cache,
      path: normalizedPath,
      type: "dir",
      data: updatedData,
    });

    return updatedData;
  } finally {
    // 释放锁
    if (releaseLock) {
      releaseLock();
      dirUpdateLocks.delete(normalizedPath);
    }
  }
};

// 将ReadableStream转为Blob
const streamToBlob = async (stream) => {
  const reader = stream.getReader();
  let finalBlob = new Blob([]);

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    // 为每个数据块创建一个新的 Blob 并与之前的合并
    finalBlob = new Blob([finalBlob, value]);
  }

  return finalBlob;
};
