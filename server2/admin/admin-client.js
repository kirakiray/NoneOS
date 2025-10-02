// 管理界面的WebSocket连接
let adminSocket = null;
let connectionStartTime = null;
let totalConnections = 0;
let clients = new Map();

// DOM元素引用
const connectionStatusEl = document.getElementById("connectionStatus");
const onlineCountEl = document.getElementById("onlineCount");
const totalConnectionsEl = document.getElementById("totalConnections");
const uptimeEl = document.getElementById("uptime");
const clientsTableBodyEl = document.getElementById("clientsTableBody");
const logsEl = document.getElementById("logs");
const refreshBtn = document.getElementById("refreshBtn");

// 连接到WebSocket服务器
function connect() {
  // 获取当前页面的协议、主机和端口
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.hostname;
  const port = 18290; // 服务器运行端口

  // 构建WebSocket URL (指定服务器端口)
  const wsUrl = `${protocol}//${host}:${port}`;

  try {
    adminSocket = new WebSocket(wsUrl);
    connectionStartTime = new Date();

    // 更新连接状态显示
    adminSocket.onopen = function (event) {
      connectionStatusEl.textContent = "已连接";
      connectionStatusEl.className = "status connected";
      logMessage("INFO", "成功连接到WebSocket服务器");
    };

    // 处理接收到的消息
    adminSocket.onmessage = function (event) {
      try {
        const data = JSON.parse(event.data);
        handleMessage(data);
      } catch (e) {
        logMessage("ERROR", `解析消息失败: ${e.message}`);
      }
    };

    // 处理连接关闭
    adminSocket.onclose = function (event) {
      connectionStatusEl.textContent = "已断开";
      connectionStatusEl.className = "status disconnected";
      logMessage("WARNING", `与服务器的连接已断开 (代码: ${event.code})`);

      // 尝试重新连接
      setTimeout(connect, 3000);
    };

    // 处理错误
    adminSocket.onerror = function (error) {
      logMessage("ERROR", `WebSocket错误: ${error.message}`);
    };
  } catch (e) {
    logMessage("ERROR", `连接失败: ${e.message}`);
  }
}

const password = "admin123";

// 处理从服务器接收到的消息
function handleMessage(data) {
  switch (data.type) {
    case "welcome":
      logMessage("INFO", `服务器欢迎消息: ${data.message}`);
      // 发送请求获取当前连接信息
      adminSocket.send(JSON.stringify({ type: "get_connections", password }));
      break;

    case "connections_info":
      updateClientsList(data.clients);
      break;

    case "broadcast":
      logMessage("INFO", `广播消息: ${data.message}`);
      break;

    case "error":
      logMessage("ERROR", `服务器错误: ${data.message}`);
      break;

    default:
      logMessage("WARNING", `未知消息类型: ${data.type}`);
  }
}

// 更新客户端列表显示
function updateClientsList(clientsData) {
  // 清空现有列表
  clientsTableBodyEl.innerHTML = "";

  // 更新在线用户数
  onlineCountEl.textContent = clientsData.length;

  // 填充客户端列表
  clientsData.forEach((client) => {
    const row = document.createElement("tr");

    // 格式化连接时间
    const connectTime = new Date(client.connectTime).toLocaleString();

    row.innerHTML = `
            <td>${client.id || "N/A"}</td>
            <td>${connectTime}</td>
            <td>${client.ip || "N/A"}</td>
            <td>
                <button class="action-btn disconnect" onclick="disconnectClient('${
                  client.id
                }')">断开</button>
            </td>
        `;

    clientsTableBodyEl.appendChild(row);
  });
}

// 断开指定客户端的连接
function disconnectClient(clientId) {
  if (adminSocket && adminSocket.readyState === WebSocket.OPEN) {
    adminSocket.send(
      JSON.stringify({
        type: "disconnect_client",
        clientId: clientId,
      })
    );
    logMessage("INFO", `已发送断开客户端 ${clientId} 的连接请求`);
  } else {
    logMessage("ERROR", "WebSocket连接未建立，无法发送断开请求");
  }
}

// 刷新客户端列表
function refreshClientsList() {
  if (adminSocket && adminSocket.readyState === WebSocket.OPEN) {
    adminSocket.send(JSON.stringify({ type: "get_connections", password }));
    logMessage("INFO", "已发送刷新客户端列表请求");
  } else {
    logMessage("ERROR", "WebSocket连接未建立，无法发送刷新请求");
  }
}

// 添加日志消息
function logMessage(level, message) {
  const now = new Date();
  const timeStr = now.toTimeString().split(" ")[0];

  const logEntry = document.createElement("div");
  logEntry.className = `log-entry log-${level.toLowerCase()}`;
  logEntry.innerHTML = `<span class="log-time">[${timeStr}]</span> <span class="log-${level.toLowerCase()}">${message}</span>`;

  logsEl.appendChild(logEntry);
  logsEl.scrollTop = logsEl.scrollHeight;
}

// 更新运行时间显示
function updateUptime() {
  if (connectionStartTime) {
    const now = new Date();
    const diff = new Date(now - connectionStartTime);

    const hours = String(diff.getUTCHours()).padStart(2, "0");
    const minutes = String(diff.getUTCMinutes()).padStart(2, "0");
    const seconds = String(diff.getUTCSeconds()).padStart(2, "0");

    uptimeEl.textContent = `${hours}:${minutes}:${seconds}`;
  }
}

// 页面加载完成后初始化
document.addEventListener("DOMContentLoaded", function () {
  // 开始连接WebSocket服务器
  connect();

  // 定期更新运行时间
  setInterval(updateUptime, 1000);

  // 添加一些示例日志
  logMessage("INFO", "管理员面板已加载");

  // 为刷新按钮添加点击事件监听器
  if (refreshBtn) {
    refreshBtn.addEventListener("click", refreshClientsList);
  }
});
