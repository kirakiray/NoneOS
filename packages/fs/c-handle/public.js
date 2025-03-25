// 保存
export const saveCache = async (cache, path, data, type) => {
  // 规范化路径
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // 根据类型处理数据
  const content = type === "dir" ? JSON.stringify(data) : data;

  const resp = new Response(content, {
    headers: {
      "x-type": type,
      "cache-control": "no-cache", // 添加缓存控制头
    },
  });

  // 写入一个response
  await cache.put(normalizedPath, resp);
};

export const getCache = async (cache, path) => {
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
