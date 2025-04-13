import { get } from "/packages/fs/main.js";

// 缓存清理服务
const startCacheCleanupService = async () => {
  console.log("启动缓存清理服务 (Worker)");

  const cleanupCache = async () => {
    try {
      // 获取缓存根目录
      const cachesRoot = await get("local/caches");

      if (!cachesRoot) {
        return;
      }

      // 遍历所有用户目录
      for await (const userDirHandle of cachesRoot.values()) {
        // 检查 infos 目录
        const infosDir = await userDirHandle.get("infos");

        if (infosDir) {
          const now = Date.now();
          const fiveMinutes = 5 * 60 * 1000;

          for await (const [infoFileName, infoHandle] of infosDir.entries()) {
            try {
              const infoContent = await infoHandle.text();
              const info = JSON.parse(infoContent);

              // 检查是否超过五分钟
              if (now - info.time > fiveMinutes) {
                // 删除对应的块文件
                const chunksDir = await userDirHandle.get("chunks");
                if (chunksDir) {
                  const chunkHandle = await chunksDir.get(infoFileName);
                  if (chunkHandle) {
                    await chunkHandle.remove();
                    console.log(
                      `已清理过期缓存块: ${userDirHandle.name}/${infoFileName}`
                    );
                  }
                }

                // 删除信息文件
                await infoHandle.remove();
                console.log(
                  `已清理过期缓存信息: ${userDirHandle.name}/${infoFileName}`
                );
              }
            } catch (err) {
              console.error(
                `处理缓存信息文件出错: ${userDirHandle.name}/${infoFileName}`,
                err
              );
            }
          }
        }
      }

      console.log("缓存清理完成");
    } catch (err) {
      console.error("缓存清理服务出错:", err);
    }
  };

  // 立即执行一次清理
  await cleanupCache();

  // 每分钟执行一次清理
  setInterval(cleanupCache, 60 * 1000);
};

// 监听连接
self.onconnect = function(e) {
  const port = e.ports[0];
  
  port.onmessage = function(e) {
    if (e.data === 'start') {
      // 启动缓存清理服务
      startCacheCleanupService();
      port.postMessage('缓存清理服务已启动');
    }
  };
  
  port.start();
};