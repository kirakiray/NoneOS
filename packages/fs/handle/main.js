import { DirHandle } from "./dir.js";

export const get = async (path, options) => {
  // 获取根目录
  let opfsRoot = null;

  try {
    opfsRoot = await navigator.storage.getDirectory();
  } catch (err) {
    console.error(err);
    throw err;
  }

  // 解析路径
  const pathParts = path.split("/").filter(Boolean);

  if (pathParts.length === 0) {
    throw new Error("路径不能为空");
  }

  // 获取根空间名称
  const rootName = pathParts[0];

  try {
    // 尝试获取根目录句柄
    const rootDir = await opfsRoot.getDirectoryHandle(rootName);
    const dirHandle = new DirHandle(rootDir);

    // 如果只有根目录，直接返回
    if (pathParts.length === 1) {
      return dirHandle;
    }

    // 通过根目录，使用get方法获取剩余路径
    const remainingPath = pathParts.slice(1).join("/");
    return await dirHandle.get(remainingPath, options);
  } catch (error) {
    if (error.name === "NotFoundError") {
      throw new Error(
        `根目录 "${rootName}" 不存在，请先使用 init("${rootName}") 初始化`,
        {
          cause: error,
        }
      );
    }
    throw error;
  }
};

// 初始化空间
export const init = async (name) => {
  let opfsRoot = null;

  try {
    opfsRoot = await navigator.storage.getDirectory();
  } catch (err) {
    console.error(err);
    throw err;
  }

  const dir = await opfsRoot.getDirectoryHandle(name, { create: true });

  return new DirHandle(dir);
};

export default get;
