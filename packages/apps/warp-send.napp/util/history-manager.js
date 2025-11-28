import { get } from "/packages/fs/main.js";
import { exportHandle } from "/packages/fs/task/main.js";

// 下载到本地
export const download = async (taskHash) => {
  // 写入临时目录
  const tempRootDir = await get("local/temp/received", { create: "dir" });

  const taskDir = await tempRootDir.get(taskHash);

  await exportHandle([taskDir.path]);
};

export const loadHistory = async () => {
  const tempRootDir = await get("local/temp/received", { create: "dir" });

  const list = [];

  for await (let handle of tempRootDir.values()) {
    if (handle.kind === "dir") {
      continue;
    }
    try {
      const data = await handle.json();

      if (data.files.length) {
        // 检查是否接受完毕
        const dir = await tempRootDir.get(data.taskHash);

        const dirLength = await dir.length();

        if (dirLength >= data.files.length) {
          // 接受完毕
          data.status = "done";
        } else if (dirLength > 0) {
          data.status = "partial"; // 未接受完成
        } else {
          continue;
        }
      }

      list.push(data);
    } catch (error) {
      console.error(`解析历史记录文件 ${handle.name} 时出错:`, error);
      continue;
    }
  }

  return list;
};
