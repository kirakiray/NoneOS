// 创建一个 SharedWorker 来测试 CacheStorage 的可用性
self.onconnect = async function(e) {
  const port = e.ports[0];
  
  try {
    // 测试 caches 是否可用
    if ('caches' in self) {
      // 尝试创建和访问缓存
      const cache = await caches.open('test-cache');
      await cache.put('/test', new Response('test data'));
      
      const response = await cache.match('/test');
      const data = await response.text();
      
      // 删除测试缓存
      await caches.delete('test-cache');
      
      port.postMessage({
        success: true,
        message: '✅ SharedWorker 中可以使用 CacheStorage',
        data: data
      });
    } else {
      port.postMessage({
        success: false,
        message: '❌ SharedWorker 中不支持 CacheStorage'
      });
    }
  } catch (error) {
    port.postMessage({
      success: false,
      message: `❌ 测试出错: ${error.message}`
    });
  }
};