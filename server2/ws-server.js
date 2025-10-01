import WebSocket from "ws";

// 创建WebSocket服务器，监听在8080端口
const wss = new WebSocket.Server({ port: 8080 });

console.log("WebSocket服务器启动，监听端口 8080");

// 处理连接事件
wss.on("connection", function connection(ws) {
  console.log("新的客户端连接");

  // 向客户端发送欢迎消息
  ws.send(
    JSON.stringify({
      type: "welcome",
      message: "欢迎连接到WebSocket服务器",
    })
  );

  // 监听客户端消息
  ws.on("message", function incoming(data) {
    console.log("收到客户端消息:", data.toString());

    try {
      // 解析客户端发送的JSON数据
      const message = JSON.parse(data.toString());

      // 根据消息类型处理
      switch (message.type) {
        case "echo":
          // 回显消息
          ws.send(
            JSON.stringify({
              type: "echo",
              message: message.message,
              timestamp: new Date().toISOString(),
            })
          );
          break;

        case "broadcast":
          // 广播消息给所有连接的客户端
          wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({
                  type: "broadcast",
                  message: message.message,
                  timestamp: new Date().toISOString(),
                })
              );
            }
          });
          break;

        default:
          ws.send(
            JSON.stringify({
              type: "error",
              message: "未知的消息类型",
            })
          );
      }
    } catch (error) {
      console.error("处理消息时出错:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "消息格式错误",
        })
      );
    }
  });

  // 监听连接关闭事件
  ws.on("close", function close() {
    console.log("客户端断开连接");
  });

  // 监听错误事件
  ws.on("error", function error(err) {
    console.error("WebSocket错误:", err);
  });
});
