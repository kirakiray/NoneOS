#!/usr/bin/env node

// index.js - WebSocket服务器入口文件
import { WebSocketServer } from './ws-server.js';

// 创建WebSocket服务器实例
const server = new WebSocketServer();

// 启动服务器，监听18290端口
server.start(18290);

// 优雅关闭服务器
process.on('SIGINT', () => {
  console.log('\n正在关闭服务器...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n正在关闭服务器...');
  server.stop();
  process.exit(0);
});

console.log('WebSocket服务器已启动，按 Ctrl+C 关闭服务器');