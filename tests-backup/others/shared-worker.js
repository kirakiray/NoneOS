import { generateKeyPair } from "/packages/user/util.js";

// 这是一个简单的 SharedWorker 实现
// 用于在多个页面间共享数据

let connections = 0; // 记录连接数
const connectedPorts = []; // 存储所有连接的端口

// 当有新连接时触发
self.onconnect = function (e) {
  const port = e.ports[0];
  connections++;
  connectedPorts.push(port);

  // 向所有已连接的端口广播连接数更新
  broadcastConnections();

  // 监听来自页面的消息
  port.onmessage = function (e) {
    const data = e.data;

    if (data.type === "MESSAGE") {
      // 广播消息给所有连接的页面
      broadcastMessage(data.content, port);
    } else if (data.type === "GET_CONNECTIONS") {
      // 返回当前连接数
      port.postMessage({
        type: "CONNECTIONS",
        count: connections,
      });
    }
  };

  // 当连接关闭时
  port.addEventListener("beforeunload", function () {
    const index = connectedPorts.indexOf(port);
    if (index > -1) {
      connectedPorts.splice(index, 1);
      connections--;
      broadcastConnections();
    }
  });

  // 启动端口
  port.start();
};

// 广播连接数给所有页面
function broadcastConnections() {
  connectedPorts.forEach((port) => {
    port.postMessage({
      type: "CONNECTIONS",
      count: connections,
    });
  });
}

// 广播消息给所有页面（除了发送者）
function broadcastMessage(message, senderPort) {
  connectedPorts.forEach((port) => {
    if (port !== senderPort) {
      port.postMessage({
        type: "MESSAGE",
        content: message,
      });
    }
  });
}
