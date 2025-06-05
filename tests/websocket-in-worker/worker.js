import { Stanz } from "/packages/libs/stanz/stanz.mjs";

// worker.js
// 测试Web Worker中是否可以使用WebSocket
self.onmessage = function (e) {
  const sdata = new Stanz({ a: "aaa" });
  if (e.data === "start") {
    try {
      // 尝试在Worker中创建WebSocket
      const socket = new WebSocket("wss://hand2.tutous.com:55793");

      socket.onopen = function () {
        self.postMessage(
          "WebSocket在Worker中创建成功！" + JSON.stringify(sdata)
        );
      };

      socket.onerror = function (error) {
        self.postMessage("WebSocket创建失败: " + error.message);
      };
    } catch (error) {
      self.postMessage("捕获到异常: " + error.message);
    }
  } else if (e.data === "check-opfs") {
    if (navigator.storage && navigator.storage.getDirectory) {
      self.postMessage("Web Worker中可以使用OPFS！");
    } else {
      self.postMessage("Web Worker中无法使用OPFS。");
    }
  }
};
