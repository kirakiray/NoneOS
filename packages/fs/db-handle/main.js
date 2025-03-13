// safari专供的文件系统，因为它的 servers worker 不支持 getDirectoryHandle
import { DirDBHandle } from "./dir.js";
import { getData, setData, getRandomId } from "./db.js";

export const get = async (path, options) => {
  // 解析路径
  const pathParts = path.split("/");

  if (pathParts.length === 0) {
    throw new Error("路径不能为空");
  }

  // 获取根空间名称
  const rootName = pathParts[0];

  // 从数据库中查询对应的文件/目录数据
  const data = await getData({
    indexName: "parentAndName",
    index: ["root", rootName],
  });

  // 如果数据不存在，返回 null
  if (!data) {
    return null;
  }

  // 根据类型返回对应的 handle
  const rootHandle = new DirDBHandle({
    name: data.name,
    dbId: data.id,
  });

  if (pathParts.length === 1) {
    return rootHandle;
  }

  const target = await rootHandle.get(pathParts.slice(1).join("/"), options);

  return target;
};

export const init = async (name) => {
  let rootData = await getData({
    indexName: "parentAndName",
    index: ["root", name],
  });

  if (!rootData) {
    rootData = {
      id: getRandomId(),
      parent: "root",
      name,
      type: "dir",
    };

    // 不存在该根目录，重新创建
    await setData({
      puts: [rootData],
    });
  }

  return new DirDBHandle({
    name: rootData.name,
    dbId: rootData.id,
    //  root,
    // parent,
  });
};
