// 备份最简单版本
// 直接保存，没有使用队列
const directSaveToCache = async ({ cache, path, data, type }) => {
  // 规范化路径
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  console.log("saveCache start", normalizedPath, "data:", data);
  try {
    const content = type === "dir" ? JSON.stringify(data) : data;
    const resp = new Response(content, {
      headers: {
        "x-type": type,
        "cache-control": "no-cache",
      },
    });
    await cache.put(normalizedPath, resp);
  } finally {
    console.log("saveCache end", normalizedPath, "data:", data);
  }
};

export const directGetCache = async (cache, path) => {
  // 规范化路径
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  const matched = await cache.match(normalizedPath);

  if (!matched) {
    return {
      type: null,
      data: null,
    };
  }

  const type = matched.headers.get("x-type");

  try {
    if (!matched.body) {
      return {
        type,
        data: matched.body,
      };
    }
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

// 保存
export const saveCache = async ({ cache, path, data, type }) => {
  // 规范化路径
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return executeInQueue(normalizedPath, async () => {
    await directSaveToCache({
      cache,
      path,
      data,
      type,
    });
  });
};

// 获取缓存
export const getCache = async (cache, path) => {
  // 规范化路径
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return executeInQueue(normalizedPath, async () => {
    return await directGetCache(cache, path);
  });
};

// 确保缓存
export const ensureCache = async ({ cache, path, type: enType }) => {
  // 规范化路径
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return executeInQueue(normalizedPath, async () => {
    const { type, data } = await directGetCache(cache, normalizedPath);

    if (type) {
      return;
    }

    let finalData = null;
    if (enType === "dir") {
      finalData = [];
    } else if (enType === "file") {
      finalData = "";
    }

    console.log(`新创建路径: ${normalizedPath}, 类型: ${enType}`);
    await directSaveToCache({
      type: enType,
      cache,
      data: finalData,
      path: normalizedPath,
    });
  });
};

// 目录添加子目录或子文件信息
export const updateDir = async ({ cache, path, remove, add }) => {
  // 规范化路径
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return executeInQueue(normalizedPath, async () => {
    // 获取当前目录的缓存数据
    const { data: currentData } = await directGetCache(cache, normalizedPath);

    // 如果目录不存在，抛出错误
    if (!currentData) {
      debugger;
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
    await directSaveToCache({
      cache,
      path: normalizedPath,
      type: "dir",
      data: updatedData,
    });

    return updatedData;
  });
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

// 获取路径的所有父路径
const getParentPaths = (path) => {
  const parts = path.split("/").filter(Boolean);
  const paths = [];
  let current = "";

  for (const part of parts.slice(0, -1)) {
    current += "/" + part;
    paths.push(current);
  }

  return paths;
};

// 队列处理器
const queue = new Map();
const executeInQueue = async (key, operation) => {
  // 获取所有父路径
  const parentPaths = getParentPaths(key);

  // 等待所有父路径的操作完成
  const parentPromises = parentPaths.map(
    (path) => queue.get(path) || Promise.resolve()
  );
  await Promise.all(parentPromises);

  const current = queue.get(key) || Promise.resolve();
  const next = current.then(async () => {
    try {
      return await operation();
    } finally {
      if (queue.get(key) === next) {
        queue.delete(key);
      }
    }
  });
  queue.set(key, next);
  return next;
};
