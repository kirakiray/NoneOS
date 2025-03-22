// import "./sw/main.js";
importScripts("sw/dist.js");

// 添加拦截特定请求的事件监听器
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 检查是否是目标路径
  if (url.pathname === "/test-haha/share.js") {
    // 代理到 shared-worker.js 文件
    event.respondWith(
      fetch("tests/others/shared-worker.js")
        .then((response) => {
          // 返回响应，但将 Content-Type 设置为 JavaScript
          return new Response(response.body, {
            headers: {
              "Content-Type": "application/javascript",
              // 保留其他可能需要的响应头
              "Cache-Control":
                response.headers.get("Cache-Control") || "no-cache",
            },
            status: response.status,
            statusText: response.statusText,
          });
        })
        .catch((error) => {
          console.error("代理请求失败:", error);
          return new Response('console.error("加载 shared-worker.js 失败");', {
            headers: { "Content-Type": "application/javascript" },
          });
        })
    );
  }
});
