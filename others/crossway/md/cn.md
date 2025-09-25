# Crossway

一个简单的 CORS 代理服务器，用于绕过浏览器的 CORS 限制。

## 简介

Crossway 是一个轻量级的代理服务器，可以帮助开发者解决跨域资源共享（CORS）限制问题。当您在前端应用中尝试访问不同域的 API 时，浏览器的安全策略会阻止这些请求。通过使用此代理服务器，您可以轻松绕过这些限制。

## 功能特性

- 绕过浏览器 CORS 限制
- 支持所有 HTTP 方法（GET、POST、PUT、DELETE 等）
- 支持 HTTPS 目标站点
- 简单易用的 API
- 提供客户端 fetch 封装

## 安装

确保您的系统已安装 Node.js（版本 14 或更高）。

```bash
# 克隆项目
git clone <repository-url>
cd cors-proxy

# 安装依赖
npm install
```

## 使用方法

### 启动服务器

```bash
# 使用默认端口 3000 和路径 "/"
npm start

# 或者指定端口和路径
node index.js --port=30110 --path=/cors-proxy
```

### 通过代理发送请求

#### 1. 直接使用 URL

启动服务器后，您可以通过以下方式访问目标 URL：

```
http://localhost:30110/cors-proxy?url=https://api.example.com/data
```

#### 2. 使用提供的 fetch 封装

项目提供了一个 fetch 封装，可以更方便地发送请求：

```javascript
import { fetch, config } from "./src/fetch.js";

// 配置代理服务器
config.port = 30110;
config.path = "/cors-proxy";

// 发送请求
const response = await fetch("https://api.example.com/data");
const data = await response.json();
```

### 客户端示例

查看 `demo.html` 文件了解完整的使用示例。

## API 说明

### 服务器端点

- **GET/POST/PUT/DELETE** `/[path]?url=[targetUrl]`
  - `path`: 配置的服务器路径前缀
  - `url`: 需要代理的目标 URL（需要进行 URL 编码）

### 响应

代理服务器会返回目标 URL 的响应，并添加适当的 CORS 头部：

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

## 配置选项

### 命令行参数

- `-p, --port`: 服务器端口（默认: 3000 或环境变量 PORT）
- `-P, --path`: 服务器路径前缀（默认: "/"）

### 环境变量

- `PORT`: 服务器端口（默认: 3000）

## 开发

### 项目结构

```
cors-proxy/
├── index.js          # 服务器入口点
├── demo.html         # 使用示例
├── package.json      # 项目配置
├── src/
│   ├── server.js     # 服务器核心逻辑
│   └── fetch.js      # 客户端 fetch 封装
└── README.md         # 项目文档
```

### 服务器核心逻辑

服务器通过以下步骤处理请求：

1. 验证请求路径是否匹配配置的路径前缀
2. 添加 CORS 头部到响应
3. 处理 OPTIONS 预检请求
4. 解析目标 URL
5. 向目标服务器发起请求
6. 转发响应给客户端

## 许可证

本项目采用 Apache-2.0 许可证。详情请见 [LICENSE](LICENSE) 文件。