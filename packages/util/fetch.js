export const config = {
  port: 25100,
  path: "/proxy",
};

/**
 * 通过CORS代理发送请求的fetch封装
 * @param {string} targetUrl - 目标URL
 * @param {Object} options - fetch选项
 * @returns {Promise<Response>}
 */
function proxyFetch(targetUrl, options = {}) {
  // 构建代理URL
  const proxyUrl = `http://localhost:${config.port}${
    config.path
  }?url=${encodeURIComponent(targetUrl)}`;

  // 使用标准fetch API发送请求到代理服务器
  return fetch(proxyUrl, options);
}

// 同时导出为默认和命名导出
export default proxyFetch;
export { proxyFetch as fetch };
