#!/usr/bin/env bun

import { serve } from "bun";
import { existsSync, statSync } from "fs";
import { join, extname } from "path";

const PORT = process.env.PORT || 30100;
const SOURCES_DIR = join(import.meta.dir, "sources");

// MIME 类型映射
const MIME_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".xml": "application/xml",
  ".map": "application/json",
};

function getMimeType(filePath) {
  const ext = extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

function serveStaticFile(filePath) {
  try {
    if (!existsSync(filePath)) {
      return new Response("404 Not Found", { status: 404 });
    }

    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      // 如果是目录，尝试返回 index.html
      const indexPath = join(filePath, "index.html");
      if (existsSync(indexPath)) {
        return serveStaticFile(indexPath);
      }
      // 否则返回目录列表
      return serveDirectoryListing(filePath);
    }

    const file = Bun.file(filePath);
    const mimeType = getMimeType(filePath);

    return new Response(file, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error(`Error serving file ${filePath}:`, error);
    return new Response("500 Internal Server Error", { status: 500 });
  }
}

function serveDirectoryListing(dirPath) {
  try {
    const { readdirSync } = require("fs");
    const files = readdirSync(dirPath);
    const relativePath = dirPath.replace(SOURCES_DIR, "") || "/";

    let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Directory listing for ${relativePath}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #333; }
        ul { list-style-type: none; padding: 0; }
        li { padding: 5px 0; }
        a { color: #0066cc; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .directory { font-weight: bold; }
        .file { color: #666; }
    </style>
</head>
<body>
    <h1>Directory listing for ${relativePath}</h1>
    <ul>`;

    // 添加上级目录链接
    if (relativePath !== "/") {
      const parentPath = relativePath.split("/").slice(0, -1).join("/") || "/";
      html += `<li><a href="${parentPath}" class="directory">../</a></li>`;
    }

    files.forEach((file) => {
      const filePath = join(dirPath, file);
      const stat = statSync(filePath);
      const href = join(relativePath, file);

      if (stat.isDirectory()) {
        html += `<li><a href="${href}/" class="directory">📁 ${file}/</a></li>`;
      } else {
        const size = (stat.size / 1024).toFixed(1);
        html += `<li><a href="${href}" class="file">📄 ${file}</a> (${size} KB)</li>`;
      }
    });

    html += `</ul>
</body>
</html>`;

    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error("Error serving directory listing:", error);
    return new Response("500 Internal Server Error", { status: 500 });
  }
}

const server = serve({
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url);
    let pathname = url.pathname;

    // 规范化路径，防止目录遍历
    pathname = pathname.replace(/\.\./g, "").replace(/\/+/g, "/");

    // 根路径重定向到 sources 目录
    if (pathname === "/") {
      pathname = "/";
    }

    const filePath = join(SOURCES_DIR, pathname);

    console.log(`${new Date().toISOString()} - ${request.method} ${pathname}`);

    return serveStaticFile(filePath);
  },
});

console.log(`🚀 Static server running at:`);
console.log(`  Local: http://localhost:${PORT}`);
console.log(`  Network: http://${require("os").hostname()}:${PORT}`);
console.log(`📁 Serving files from: ${SOURCES_DIR}`);
console.log(`Press Ctrl+C to stop the server`);

// 优雅关闭
process.on("SIGINT", () => {
  console.log("\n👋 Server shutting down...");
  process.exit(0);
});
