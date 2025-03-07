onmessage = async (event) => {
  // const { fileHandle, content } = event.data;
  const { content, path } = event.data;

  try {
    // 先获取目标文件
    let fileHandle = await navigator.storage.getDirectory();
    const paths = path.split("/");
    const pathLen = paths.length;
    let count = 0;

    for (let fName of paths) {
      count++;

      if (count < pathLen) {
        fileHandle = await fileHandle.getDirectoryHandle(fName);
        continue;
      }

      fileHandle = await fileHandle.getFileHandle(fName);
    }

    // 创建同步访问句柄
    const syncHandle = await fileHandle.createSyncAccessHandle();

    let data = content;

    // 如果内容是字符串，则将其转换为 Uint8Array
    if (typeof content === "string") {
      data = new TextEncoder().encode(content);
    }

    // 清空文件内容
    syncHandle.truncate(0);

    // 写入文件（从文件开头写入）
    syncHandle.write(data, { at: 0 });

    // 冲刷缓冲区并关闭句柄
    syncHandle.flush();
    syncHandle.close();

    // 发送成功消息
    postMessage({ success: true });
  } catch (error) {
    postMessage({ success: false, error });
  }
};
