// SharedWorker 实现
const connections = new Set();

// 处理连接
self.onconnect = function (e) {
  const port = e.ports[0];
  connections.add(port);
  port.start();

  port.postMessage({ message: "SharedWorker 已连接" });

  // 处理来自主页面的消息
  port.onmessage = async function (e) {
    const data = e.data;

    try {
      switch (data.action) {
        case "init":
          // 测试 OPFS 是否可用
          try {
            await testOPFSAvailability(port);
          } catch (error) {
            port.postMessage({ error: `OPFS 不可用: ${error.message}` });
          }
          break;

        case "writeFile":
          await writeFile(data.filename, data.content, port);
          break;

        case "readFile":
          await readFile(data.filename, port);
          break;

        case "listFiles":
          await listFiles(port);
          break;

        case "deleteFile":
          await deleteFile(data.filename, port);
          break;

        default:
          port.postMessage({ error: `未知操作: ${data.action}` });
      }
    } catch (error) {
      port.postMessage({ error: `操作失败: ${error.message}` });
    }
  };
};

// 测试 OPFS 是否可用
async function testOPFSAvailability(port) {
  if (
    !self.navigator ||
    !self.navigator.storage ||
    !self.navigator.storage.getDirectory
  ) {
    throw new Error("OPFS API 在此环境中不可用");
  }

  try {
    const root = await self.navigator.storage.getDirectory();
    port.postMessage({ message: "OPFS 在 SharedWorker 中可用" });
    return root;
  } catch (error) {
    throw new Error(`无法访问 OPFS: ${error.message}`);
  }
}

// 获取 OPFS 根目录
async function getRoot() {
  return await self.navigator.storage.getDirectory();
}

// 写入文件
async function writeFile(filename, content, port) {
  const root = await getRoot();

  // 创建或打开文件
  const fileHandle = await root.getFileHandle(filename, { create: true });

  // 获取可写入流
  const writable = await fileHandle.createWritable();

  // 写入内容
  await writable.write(content);

  // 关闭流
  await writable.close();

  port.postMessage({ message: `文件 ${filename} 已成功写入` });
}

// 读取文件
async function readFile(filename, port) {
  const root = await getRoot();

  try {
    // 获取文件句柄
    const fileHandle = await root.getFileHandle(filename);

    // 获取文件对象
    const file = await fileHandle.getFile();

    // 读取文件内容
    const content = await file.text();

    port.postMessage({ message: `文件 ${filename} 内容: ${content}` });
  } catch (error) {
    port.postMessage({ error: `读取文件 ${filename} 失败: ${error.message}` });
  }
}

// 列出所有文件
async function listFiles(port) {
  const root = await getRoot();
  const files = [];

  // 遍历目录中的所有条目
  for await (const [name, entry] of root.entries()) {
    const type = entry.kind;
    files.push({ name, type });
  }

  if (files.length === 0) {
    port.postMessage({ message: "目录为空" });
  } else {
    const fileList = files.map((f) => `${f.name} (${f.type})`).join(", ");
    port.postMessage({ message: `文件列表: ${fileList}` });
  }
}

// 删除文件
async function deleteFile(filename, port) {
  const root = await getRoot();

  try {
    await root.removeEntry(filename);
    port.postMessage({ message: `文件 ${filename} 已成功删除` });
  } catch (error) {
    port.postMessage({ error: `删除文件 ${filename} 失败: ${error.message}` });
  }
}
