# NoneOS - 基于浏览器的轻量级虚拟操作系统

## 项目简介

NoneOS是一个创新的浏览器虚拟操作系统解决方案，采用纯静态文件架构，无需后端服务器支持即可运行。

短期目标：打造基于浏览器的轻量级 NAS 系统，实现设备间的无缝连接与协作。

- [x] 支持浏览器端文件管理
- [x] 收藏夹同步应用
- [ ] 传送文件应用（类似LocalSend）
- [ ] 笔记同步应用（类似Notion）

## 快速开始

直接访问官方站点: [https://os.tutous.com/](https://os.tutous.com/)

### 本地运行
1. 克隆或下载项目，并确保本地安装了 nodejs。
2. 安装依赖:
```bash
npm install
```
3. 启动服务器:
```bash
npm run static
```
4. 访问: `http://localhost:5559/`